import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const MODELS_URL = '/models';
const SCANS_NEEDED = 15; // 3 samples per angle for robust multi-image enrollment

const FaceSetup = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  // Load models
  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        setModelsLoaded(true);
      } catch {
        toast.error('Failed to load face models');
      }
    };
    load();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startScan = async () => {
    setStatus('scanning');
    setProgress(0);
    setMessage('Opening camera...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Wait for video frames
      await new Promise((resolve) => {
        if (videoRef.current.readyState >= 3) { resolve(); return; }
        videoRef.current.addEventListener('canplay', resolve, { once: true });
      });

      setMessage('Camera ready. Hold still while we scan your face...');
      await new Promise((r) => setTimeout(r, 1500));
      const descriptors = [];

      const scanPrompts = [
        "Look straight at the camera",
        "Slowly turn your head left",
        "Slowly turn your head right",
        "Tilt your head up and down",
        "Now, give us a big smile!"
      ];

      while (descriptors.length < SCANS_NEEDED) {
        const promptIndex = Math.floor(descriptors.length / (SCANS_NEEDED / scanPrompts.length));
        setMessage(scanPrompts[promptIndex] || "Keep moving slightly...");
        await new Promise((r) => setTimeout(r, 800));

        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setMessage('No face detected — look directly at the camera');
          continue;
        }

        // Store full precision — do NOT round, rounding loses descriptor accuracy
        descriptors.push(Array.from(detection.descriptor));
        const count = descriptors.length;
        setProgress(Math.round((count / SCANS_NEEDED) * 100));
        setMessage(`Scan ${count}/${SCANS_NEEDED} captured — keep still...`);
      }

      stopCamera();
      setMessage('Saving your face profile...');

      // Save the full set of embeddings to support "Best Match" logic
      await API.post('/auth/save-face-descriptor', { descriptors });

      updateUser({ faceRegistered: true });
      setStatus('done');
      toast.success('Face registered successfully!');
      setTimeout(() => navigate('/student/dashboard'), 2000);
    } catch (err) {
      stopCamera();
      setStatus('error');
      setMessage(err.response?.data?.message || 'Face scan failed. Please try again.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card border-0 shadow-sm" style={{ width: '100%', maxWidth: 520 }}>
        <div className="card-body p-4">

          {/* Header */}
          <div className="text-center mb-4">
            <i className="bi bi-person-bounding-box text-primary" style={{ fontSize: 48 }}></i>
            <h5 className="fw-bold mt-2 mb-1">Face Registration</h5>
            <p className="text-muted small mb-0">
              This is a one-time setup. Your face will be scanned {SCANS_NEEDED} times
              to create a secure reference for future attendance verification.
            </p>
          </div>

          {/* Steps indicator */}
          <div className="d-flex justify-content-center gap-4 mb-4">
            {['Position face', 'Auto-scan ×5', 'Save & done'].map((label, i) => (
              <div key={label} className="d-flex flex-column align-items-center">
                <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold mb-1
                  ${status === 'done' || (status === 'scanning' && i < 2) ? 'bg-success text-white'
                    : status === 'scanning' && i === 1 ? 'bg-primary text-white'
                    : 'bg-light border text-muted'}`}
                  style={{ width: 32, height: 32, fontSize: 13 }}>
                  {status === 'done' || (status === 'scanning' && i < 1) ? <i className="bi bi-check-lg"></i> : i + 1}
                </div>
                <small className="text-muted text-center" style={{ fontSize: 10, maxWidth: 70 }}>{label}</small>
              </div>
            ))}
          </div>

          {/* Camera */}
          <div style={{ display: status === 'scanning' ? 'block' : 'none' }} className="mb-3">
            <video
              ref={videoRef}
              className="w-100 rounded border"
              style={{ maxHeight: 320, background: '#000', transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            {/* Progress bar */}
            <div className="progress mt-2" style={{ height: 10 }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                style={{ width: `${progress}%`, transition: 'width 0.3s' }}
              ></div>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <small className="text-muted font-monospace">{message}</small>
              <small className="text-primary fw-semibold">{progress}%</small>
            </div>
          </div>

          {/* Success state */}
          {status === 'done' && (
            <div className="alert alert-success text-center mb-3">
              <i className="bi bi-check-circle-fill fs-2 d-block mb-2"></i>
              <strong>Face Registered!</strong>
              <div className="text-muted small mt-1">Redirecting to your dashboard...</div>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{message}</span>
            </div>
          )}

          {/* Instructions (idle) */}
          {status === 'idle' && (
            <div className="alert alert-info small mb-3">
              <ul className="mb-0 ps-3">
                <li>Sit in a well-lit area facing the camera</li>
                <li>Keep your face centred in the frame</li>
                <li>Remove glasses or hats if possible</li>
                <li>Stay still — {SCANS_NEEDED} quick scans will be taken automatically</li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          {status !== 'done' && (
            <button
              className="btn btn-primary w-100"
              onClick={status === 'error' ? () => setStatus('idle') : startScan}
              disabled={!modelsLoaded || status === 'scanning'}
            >
              {!modelsLoaded && <span className="spinner-border spinner-border-sm me-2"></span>}
              {status === 'scanning' ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Scanning...</>
              ) : status === 'error' ? (
                <><i className="bi bi-arrow-clockwise me-2"></i>Try Again</>
              ) : modelsLoaded ? (
                <><i className="bi bi-camera-fill me-2"></i>Start Face Scan</>
              ) : (
                'Loading Models...'
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default FaceSetup;
