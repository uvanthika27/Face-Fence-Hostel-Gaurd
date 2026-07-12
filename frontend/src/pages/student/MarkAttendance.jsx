import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { getDistanceMeters, getCurrentPosition } from '../../utils/geofence';
import { useAuth } from '../../context/AuthContext';

const MODELS_URL = '/models';
const LIVENESS_CHALLENGES = ['Blink Twice', 'Smile', 'Turn Head Left', 'Turn Head Right'];
const STEP_LABELS = ['GPS Check', 'Camera', 'Liveness', 'Face Match', 'Done'];
const SMILE_THRESH = 0.65;
const YAW_THRESH   = 12;

const MarkAttendance = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const detectionRef = useRef(null);
  const modelsLoadedRef = useRef(false);
  const stepRef      = useRef(0);
  const sessionRef   = useRef(null);
  const gpsRef       = useRef(null);

  const [step,        setStep]        = useState(0);
  const [error,       setError]       = useState('');
  const [challenge,   setChallenge]   = useState('');
  const [modelsLoaded,setModelsLoaded]= useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [processing,  setProcessing]  = useState(false);
  const [debugInfo,   setDebugInfo]   = useState('');

  const setStepSync    = (s) => { stepRef.current    = s; setStep(s); };
  const setSessionSync = (s) => { sessionRef.current = s; };
  const setGpsSync     = (g) => { gpsRef.current     = g; };

  // ── Load models ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
        ]);
        modelsLoadedRef.current = true;
        setModelsLoaded(true);
      } catch (e) {
        toast.error('Failed to load face models.');
        console.error(e);
      }
    })();
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(detectionRef.current);
    detectionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const waitForVideoReady = (v) =>
    new Promise((res) => {
      if (v.readyState >= 3) { res(); return; }
      v.addEventListener('canplay', res, { once: true });
    });

  // ── Step 1: GPS ───────────────────────────────────────────────────────────
  const startFlow = async () => {
    setError(''); setStepSync(1); setDebugInfo('');
    let activeSession;
    try {
      const { data } = await API.get('/sessions/active');
      activeSession = data.session;
      setSessionSync(activeSession);
    } catch (err) {
      setError(err.response?.data?.message || 'No active session found right now.');
      setStepSync(0); return;
    }
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      setGpsSync({ latitude, longitude });
      const dist = getDistanceMeters(latitude, longitude, activeSession.latitude, activeSession.longitude);
      if (dist > activeSession.radius) {
        setError(`You are outside the hostel boundary (${Math.round(dist)}m away, limit ${activeSession.radius}m).`);
        setStepSync(0); return;
      }
      toast.success(`GPS verified ✓ (${Math.round(dist)}m from hostel)`);
      setStepSync(2);
      openCamera();
    } catch {
      setError('Location access denied. Enable GPS and try again.');
      setStepSync(0);
    }
  };

  // ── Step 2: Camera ────────────────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await waitForVideoReady(videoRef.current);
      const picked = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
      setChallenge(picked);
      setStepSync(3);
      startLivenessDetection(picked);
    } catch {
      setError('Camera access denied. Allow camera permission and try again.');
      setStepSync(0);
    }
  };

  // ── Step 3: Liveness ──────────────────────────────────────────────────────
  const startLivenessDetection = (challengeType) => {
    let blinkCount   = 0;
    let prevEAR      = null;
    let eyesWereOpen = false;

    // Auto-calibration: collect 10 open-eye EAR samples first
    // then derive this person's personal closed threshold
    let calibrated   = false;
    let calibSamples = [];
    const CALIB_NEEDED = 10;
    // fallback values used until calibration completes
    let closedThresh = 0.20;
    let openThresh   = 0.26;

    detectionRef.current = setInterval(async () => {
      if (!modelsLoadedRef.current || stepRef.current !== 3) return;
      const video = videoRef.current;
      if (!video || video.readyState < 3 || video.paused) return;

      let det;
      try {
        det = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceExpressions();
      } catch { return; }

      if (!det) {
        setDebugInfo('No face detected — look at the camera');
        return;
      }

      const lm   = det.landmarks;
      const expr = det.expressions;

      // ── Blink ─────────────────────────────────────────────────────────────
      if (challengeType === 'Blink Twice') {
        const ear = getEAR(lm);

        // Calibration phase — keep eyes OPEN and look at camera
        if (!calibrated) {
          // Only sample when eye is clearly open (avoid collecting partial blink frames)
          if (ear > 0.20) {
            calibSamples.push(ear);
            setDebugInfo(`Calibrating — keep eyes OPEN (${calibSamples.length}/${CALIB_NEEDED}) EAR: ${ear.toFixed(3)}`);
          }
          if (calibSamples.length >= CALIB_NEEDED) {
            // Sort, drop top/bottom outlier, average the rest
            const sorted  = [...calibSamples].sort((a, b) => a - b);
            const trimmed = sorted.slice(1, -1);
            const avgOpen = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
            // Closed threshold = 9 units below personal open average
            closedThresh = parseFloat((avgOpen - 0.09).toFixed(4));
            openThresh   = parseFloat((avgOpen - 0.02).toFixed(4));
            calibrated   = true;
            setDebugInfo(`Ready! Now BLINK TWICE. (open=${avgOpen.toFixed(3)}, blink<${closedThresh})`);
          }
          prevEAR = ear;
          return; // don't count blinks during calibration
        }

        setDebugInfo(`EAR: ${ear.toFixed(3)} | threshold: ${closedThresh} | blinks: ${blinkCount}/2`);

        if (ear >= openThresh)   eyesWereOpen = true;

        if (eyesWereOpen && prevEAR !== null && prevEAR > closedThresh && ear <= closedThresh) {
          blinkCount++;
          eyesWereOpen = false;
          setDebugInfo(`👁️ Blink ${blinkCount}/2 detected!`);
        }
        prevEAR = ear;
        if (blinkCount >= 2) completeLiveness(challengeType);

      // ── Smile ─────────────────────────────────────────────────────────────
      } else if (challengeType === 'Smile') {
        const happy = expr.happy;
        setDebugInfo(`Smile: ${(happy * 100).toFixed(0)}% (need ${Math.round(SMILE_THRESH * 100)}%)`);
        if (happy >= SMILE_THRESH) completeLiveness(challengeType);

      // ── Head turn left ────────────────────────────────────────────────────
      } else if (challengeType === 'Turn Head Left') {
        const yaw = getYaw(lm);
        setDebugInfo(`Yaw: ${yaw.toFixed(1)} (turn left — need > ${YAW_THRESH})`);
        if (yaw > YAW_THRESH) completeLiveness(challengeType);

      // ── Head turn right ───────────────────────────────────────────────────
      } else if (challengeType === 'Turn Head Right') {
        const yaw = getYaw(lm);
        setDebugInfo(`Yaw: ${yaw.toFixed(1)} (turn right — need < -${YAW_THRESH})`);
        if (yaw < -YAW_THRESH) completeLiveness(challengeType);
      }
    }, 150);
  };

  const completeLiveness = (challengeType) => {
    clearInterval(detectionRef.current);
    detectionRef.current = null;
    setDebugInfo(`✓ ${challengeType} detected!`);
    setStepSync(4);
    runFaceMatch();
  };

  // ── Step 4: Face match ────────────────────────────────────────────────────
  const runFaceMatch = async () => {
    setProcessing(true);
    try {
      const { data } = await API.get('/auth/me');
      // Expecting an array of descriptor arrays from multi-image enrollment
      const descriptors = data.user?.faceDescriptors || (data.user?.faceDescriptor ? [data.user.faceDescriptor] : null);

      if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
        toast.error('Face profile not found. Please register your face in the Profile section.');
        await captureAndSubmit(0); return;
      }

      await new Promise((r) => setTimeout(r, 300));

      const liveDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveDetection) {
        toast.error('Face not detected. Face the camera directly in good lighting.');
        await captureAndSubmit(0); return;
      }

      const live32 = liveDetection.descriptor;
      const storedArray = descriptors.map(d => Float32Array.from(d));
      
      // BEST MATCH CALCULATION
      const allDistances = storedArray.map(stored32 => faceapi.euclideanDistance(stored32, live32));
      const bestMatchDist = Math.min(...allDistances);
      
      // AVG OF TOP 3 MATCHES (for stability)
      const sortedDists = [...allDistances].sort((a, b) => a - b);
      const top3 = sortedDists.slice(0, 3);
      const avgTop3 = top3.reduce((a, b) => a + b, 0) / top3.length;

      // DYNAMIC THRESHOLDING
      // Typical Euclidean distances for FaceRecognitionNet:
      // < 0.4: Strong Match | 0.4-0.5: Possible | 0.5-0.6: Suspicious | > 0.6: Rejected
      let matchStatus = "Rejected";
      let confidence = 0;

      if (bestMatchDist < 0.45) {
        matchStatus = "Strong Match";
        confidence = Math.round(90 + (0.45 - bestMatchDist) * 20); // 90-100%
      } else if (bestMatchDist < 0.55) {
        matchStatus = "Possible Match";
        confidence = Math.round(75 + (0.55 - bestMatchDist) * 150); // 75-89%
      } else if (bestMatchDist < 0.62) {
        matchStatus = "Suspicious";
        confidence = Math.round(60 + (0.62 - bestMatchDist) * 100); // 60-74%
      }

      console.log(`[DEBUG] Face Recognition Logs:`);
      console.log(`- Raw Best Distance: ${bestMatchDist.toFixed(4)}`);
      console.log(`- Avg Top 3 Distance: ${avgTop3.toFixed(4)}`);
      console.log(`- Threshold Window: 0.60`);
      console.log(`- Match Decision: ${matchStatus}`);
      console.log(`- Derived Confidence: ${confidence}%`);

      setMatchResult(confidence);
      await captureAndSubmit(confidence);
    } catch (e) {
      console.error('[FaceMatch] error:', e);
      await captureAndSubmit(0);
    } finally {
      setProcessing(false);
    }
  };

  // ── Capture selfie & submit ───────────────────────────────────────────────
  const captureAndSubmit = (score) =>
    new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const video  = videoRef.current;
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        stopCamera();
        const s = sessionRef.current;
        const g = gpsRef.current;
        if (!s?._id || !g) { setError('Session or GPS lost. Try again.'); resolve(); return; }
        const fd = new FormData();
        fd.append('sessionId',  s._id);
        fd.append('latitude',   g.latitude);
        fd.append('longitude',  g.longitude);
        fd.append('matchScore', score);
        if (blob) fd.append('selfie', blob, 'selfie.jpg');
        await submitAttendance(fd);
        resolve();
      }, 'image/jpeg', 0.85);
    });

  const submitAttendance = async (fd) => {
    try {
      const { data } = await API.post('/attendance/mark', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStepSync(5);
      toast.success(data.message);
      setTimeout(() => navigate('/student/dashboard'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
      setStepSync(0);
      stopCamera();
    }
  };

  // ── Landmark helpers ──────────────────────────────────────────────────────
  const eyeAR = (p1, p2, p3, p4, p5, p6) => {
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return (d(p2, p6) + d(p3, p5)) / (2 * d(p1, p4));
  };
  const getEAR = (lm) => {
    const p = lm.positions;
    return (eyeAR(p[36], p[37], p[38], p[39], p[40], p[41]) +
            eyeAR(p[42], p[43], p[44], p[45], p[46], p[47])) / 2;
  };
  const getYaw = (lm) => {
    const p = lm.positions;
    return p[30].x - (p[36].x + p[45].x) / 2;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h5 className="fw-bold mb-4">Mark Hostel Attendance</h5>

      {/* Progress steps */}
      <div className="d-flex justify-content-between mb-4">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
            <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold mb-1
              ${step > i ? 'bg-success text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-light text-muted border'}`}
              style={{ width: 32, height: 32, fontSize: 13 }}>
              {step > i ? <i className="bi bi-check-lg"></i> : i + 1}
            </div>
            <small className={`text-center ${step === i + 1 ? 'text-primary fw-semibold' : 'text-muted'}`}
              style={{ fontSize: 10 }}>{label}</small>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill"></i><span>{error}</span>
        </div>
      )}

      {/* Camera — stay mounted for steps 2–4 */}
      <div style={{ display: [2, 3, 4].includes(step) ? 'block' : 'none' }} className="mb-3">
        <video ref={videoRef} className="w-100 rounded border"
          style={{ maxHeight: 360, background: '#000', transform: 'scaleX(-1)' }}
          muted playsInline />
        {debugInfo && (
          <div className="text-center mt-1">
            <small className="text-muted font-monospace">{debugInfo}</small>
          </div>
        )}
      </div>

      {step === 3 && (
        <div className="alert alert-primary text-center">
          <i className="bi bi-person-bounding-box fs-3 d-block mb-1"></i>
          <strong>Liveness Challenge</strong>
          <div className="fs-5 fw-bold mt-1 mb-1">{challenge}</div>
          {challenge === 'Blink Twice' && (
            <small className="text-muted d-block">First, keep eyes OPEN for calibration, then blink twice</small>
          )}
          {challenge !== 'Blink Twice' && (
            <small className="text-muted">Perform the action — it will auto-detect</small>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="alert alert-warning text-center">
          <span className="spinner-border spinner-border-sm me-2"></span>
          {processing ? 'Comparing face with registered profile...' : 'Preparing face analysis...'}
        </div>
      )}

      {step === 5 && (
        <div className="alert alert-success text-center">
          <i className="bi bi-check-circle-fill fs-2 d-block mb-2"></i>
          <strong>Attendance Submitted!</strong>
          {matchResult !== null && (
            <div className="mt-1">
              Face Match: <strong>{matchResult}%</strong>
              <span className={`ms-2 badge ${matchResult >= 85 ? 'bg-success' : 'bg-warning text-dark'}`}>
                {matchResult >= 85 ? 'Verified' : 'Suspicious'}
              </span>
            </div>
          )}
          <small className="text-muted d-block mt-1">Redirecting to dashboard...</small>
        </div>
      )}

      {step === 0 && !error && (
        <div className="text-center py-4">
          <i className="bi bi-geo-alt-fill text-primary" style={{ fontSize: 64 }}></i>
          <h4 className="fw-bold mt-3">Ready to mark attendance?</h4>
          <p className="text-muted small">Ensure you are inside the hostel premises and have good lighting.</p>
          <button className="btn btn-primary btn-lg px-5 mt-3" onClick={startFlow} disabled={!modelsLoaded}>
            {!modelsLoaded && <span className="spinner-border spinner-border-sm me-2"></span>}
            {modelsLoaded ? 'Start Verification' : 'Loading Models...'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;
    