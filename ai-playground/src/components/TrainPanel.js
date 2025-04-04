// src/components/TrainPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-vis";
import "./TrainPanel.css";

const FEATURE_SIZE = 1001; // 현재 MobileNet Graph Model의 출력 차원 (필요에 따라 조정)

const TrainPanel = ({ projectId, classes }) => {
  // 기본 webcam 및 canvas 참조 (클래스 카드용)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 예측 모드용 video 참조
  const predictionVideoRef = useRef(null);

  // MobileNet, 분류기, 학습 관련 상태
  const [mobilenet, setMobilenet] = useState(null);
  const [samples, setSamples] = useState({}); // 각 클래스별 tf.Tensor 배열
  const [sampleImages, setSampleImages] = useState({}); // 각 클래스별 base64 썸네일 배열
  const [model, setModel] = useState(null);
  const [trainingParams, setTrainingParams] = useState({
    hiddenUnits: 100,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 8,
  });

  // 클래스 이름 수정 관련
  const [editMode, setEditMode] = useState({});
  const [editedNames, setEditedNames] = useState({});

  // 카드 확장(웹캠 보이는) 상태: 한 번에 하나만 확장
  const [expandedClass, setExpandedClass] = useState(null);

  // 예측 모드 관련 상태
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState([]); // 예측 확률 배열 (클래스 순서대로)
  const predictionIntervalRef = useRef(null);

  // 연속 캡처(연사하기) 타이머
  const continuousCaptureRef = useRef(null);

  // 초기화: 각 클래스별 samples, sampleImages, editMode, 이름 설정
  useEffect(() => {
    const initSamples = {};
    const initImages = {};
    const initEdit = {};
    const initNames = {};
    classes.forEach((cls) => {
      initSamples[cls.className] = [];
      initImages[cls.className] = [];
      initEdit[cls.className] = false;
      initNames[cls.className] = cls.className;
    });
    setSamples(initSamples);
    setSampleImages(initImages);
    setEditMode(initEdit);
    setEditedNames(initNames);
  }, [classes]);

  // MobileNet 로드 (Graph Model 형식)
  useEffect(() => {
    loadMobilenet();
  }, []);

  const loadMobilenet = async () => {
    const mobilenetURL = "/mobilenet/model.json";
    try {
      const net = await tf.loadGraphModel(mobilenetURL);
      setMobilenet(net);
      console.log("MobileNet Graph Model 로드 완료");
    } catch (error) {
      console.error("MobileNet 로드 실패:", error);
      alert("모델 로드를 실패했습니다. 경로 및 모델 형식을 확인하세요.");
    }
  };

  // 웹캠 시작/중지 (클래스 카드용)
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((err) => console.error(err));
      }
    } catch (error) {
      console.error("웹캠 접근 에러:", error);
      alert("카메라 접근 권한이 필요합니다.");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // 예측 모드용 웹캠 시작/중지 (별도 video)
  const startPredictionWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (predictionVideoRef.current) {
        predictionVideoRef.current.srcObject = stream;
        await predictionVideoRef.current.play().catch((err) => console.error(err));
      }
    } catch (error) {
      console.error("예측용 웹캠 에러:", error);
      alert("예측용 카메라 접근 권한이 필요합니다.");
    }
  };

  const stopPredictionWebcam = () => {
    if (predictionVideoRef.current && predictionVideoRef.current.srcObject) {
      const tracks = predictionVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      predictionVideoRef.current.srcObject = null;
    }
  };

  // 카드 확장 토글: 해당 클래스 카드 확장 시 웹캠 시작
  const toggleExpand = async (className) => {
    if (expandedClass === className) {
      setExpandedClass(null);
      stopWebcam();
    } else {
      if (expandedClass) stopWebcam();
      setExpandedClass(className);
      await startWebcam();
    }
  };

  // 캡처 함수 (keepWebcamOpen 옵션으로 연속 캡처와 단일 캡처 구분)
  const captureSample = (className, keepWebcamOpen = false) => {
    if (!mobilenet || !videoRef.current || !className) return;
    if (
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      alert("웹캠 데이터가 아직 준비되지 않았습니다.");
      return;
    }
    tf.engine().startScope();
    const img = tf.browser.fromPixels(videoRef.current);
    const resized = tf.image.resizeBilinear(img, [224, 224]);
    const normalized = resized.expandDims(0).toFloat().div(255);
    const feature = mobilenet.predict(normalized);
    const persistentFeature = tf.keep(feature.squeeze());
    setSamples((prev) => ({
      ...prev,
      [className]: [...prev[className], persistentFeature],
    }));
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 224, 224);
      const dataUrl = canvasRef.current.toDataURL("image/jpeg");
      setSampleImages((prev) => ({
        ...prev,
        [className]: [...prev[className], dataUrl],
      }));
    }
    tf.engine().endScope();
    if (!keepWebcamOpen) {
      alert(`${className} 클래스에 샘플 추가됨`);
      // 카드를 닫고 웹캠 중지할지 여부는 필요에 따라 조정
      // 여기서는 카드를 그대로 유지합니다.
    }
  };

  // 연속 캡처(연사하기) 시작/중지
  const startContinuousCapture = () => {
    continuousCaptureRef.current = setInterval(() => {
      captureSample(expandedClass, true);
    }, 500); // 500ms 간격 (필요에 따라 조정)
  };

  const stopContinuousCapture = () => {
    if (continuousCaptureRef.current) {
      clearInterval(continuousCaptureRef.current);
      continuousCaptureRef.current = null;
    }
  };

  // 이미지 업로드 처리
  const handleImageUpload = (className, event) => {
    const file = event.target.files[0];
    if (!file || !mobilenet) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        tf.engine().startScope();
        const tensorImg = tf.browser.fromPixels(img);
        const resized = tf.image.resizeBilinear(tensorImg, [224, 224]);
        const normalized = resized.expandDims(0).toFloat().div(255);
        const feature = mobilenet.predict(normalized);
        const persistentFeature = tf.keep(feature.squeeze());
        setSamples((prev) => ({
          ...prev,
          [className]: [...prev[className], persistentFeature],
        }));
        setSampleImages((prev) => ({
          ...prev,
          [className]: [...prev[className], reader.result],
        }));
        tf.engine().endScope();
        alert(`${className} 클래스에 이미지 샘플 추가됨`);
      };
    };
    reader.readAsDataURL(file);
  };

  // 샘플 삭제 함수
  const deleteSample = (className, index) => {
    setSamples((prev) => {
      const newSamples = { ...prev };
      newSamples[className] = newSamples[className].filter(
        (_, i) => i !== index
      );
      return newSamples;
    });
    setSampleImages((prev) => {
      const newImages = { ...prev };
      newImages[className] = newImages[className].filter(
        (_, i) => i !== index
      );
      return newImages;
    });
  };

  // MLP 분류기 생성 및 학습
  const buildClassifier = (numClasses, hiddenUnits, learningRate) => {
    const classifier = tf.sequential();
    classifier.add(
      tf.layers.dense({
        units: hiddenUnits,
        activation: "relu",
        inputShape: [FEATURE_SIZE],
      })
    );
    classifier.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
    classifier.compile({
      optimizer: tf.train.adam(learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    return classifier;
  };

  const trainModel = async () => {
    const classNames = Object.keys(samples);
    for (let cls of classNames) {
      if (!samples[cls] || samples[cls].length === 0) {
        alert(`${cls} 클래스에 샘플이 없습니다.`);
        return;
      }
    }
    const features = [];
    const labels = [];
    classNames.forEach((cls, idx) => {
      samples[cls].forEach((sample) => {
        features.push(sample);
        const label = Array(classNames.length).fill(0);
        label[idx] = 1;
        labels.push(label);
      });
    });
    const trainX = tf.stack(features);
    const trainY = tf.tensor2d(labels);
    const classifier = buildClassifier(
      classNames.length,
      trainingParams.hiddenUnits,
      trainingParams.learningRate
    );
    setModel(classifier);
    await classifier.fit(trainX, trainY, {
      epochs: trainingParams.epochs,
      batchSize: trainingParams.batchSize,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss}, acc = ${logs.acc}`);
        },
      },
    });
    trainX.dispose();
    trainY.dispose();
    alert("모델 학습 완료!");
  };

  // 예측 모드: 실시간 예측 루프
  const startPrediction = async () => {
    setIsPredicting(true);
    await startPredictionWebcam();
    predictionIntervalRef.current = setInterval(() => {
      if (
        predictionVideoRef.current &&
        mobilenet &&
        model &&
        predictionVideoRef.current.videoWidth > 0
      ) {
        const img = tf.browser.fromPixels(predictionVideoRef.current);
        const resized = tf.image.resizeBilinear(img, [224, 224]);
        const normalized = resized.expandDims(0).toFloat().div(255);
        const feature = mobilenet.predict(normalized);
        const predTensor = model.predict(feature);
        const predArray = Array.from(predTensor.dataSync());
        setPredictionResult(predArray);
        tf.dispose([img, resized, normalized, feature, predTensor]);
      }
    }, 500);
  };

  const stopPrediction = () => {
    setIsPredicting(false);
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    stopPredictionWebcam();
  };

  const predict = async () => {
    if (!model || !mobilenet) {
      alert("모델 학습이 완료되지 않았습니다.");
      return;
    }
    // 예측 모드 진입
    startPrediction();
  };

  return (
    <div className="train-panel">
      <h2 className="train-panel__title">학습 패널</h2>

      {/* 각 클래스별 카드 */}
      {classes.map((cls) => {
        const className = cls.className;
        const isExpanded = expandedClass === className;
        return (
          <div key={className} className="class-card">
            <div className="class-card__header">
              {editMode[className] ? (
                <input
                  type="text"
                  value={editedNames[className]}
                  onChange={(e) =>
                    setEditedNames({ ...editedNames, [className]: e.target.value })
                  }
                  onBlur={() =>
                    setEditMode({ ...editMode, [className]: false })
                  }
                  autoFocus
                  className="class-card__name-input"
                />
              ) : (
                <div className="class-card__title">
                  {editedNames[className]}
                  <span
                    className="class-card__edit-icon"
                    onClick={() =>
                      setEditMode({ ...editMode, [className]: true })
                    }
                  >
                    &#9998;
                  </span>
                </div>
              )}
              <button
                className="class-card__btn"
                onClick={() => toggleExpand(className)}
              >
                웹캠
              </button>
              <label className="class-card__btn">
                업로드
                <input
                  type="file"
                  accept="image/*"
                  className="class-card__file-input"
                  onChange={(e) => handleImageUpload(className, e)}
                />
              </label>
            </div>
            {isExpanded && (
              <div className="class-card__body">
                <div className="class-card__webcam-area">
                  <video
                    ref={videoRef}
                    className="class-card__video"
                    width="224"
                    height="224"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="class-card__capture-buttons">
                    <button
                      className="class-card__btn"
                      onClick={() => captureSample(className)}
                    >
                      캡처
                    </button>
                    <button
                      className="class-card__btn"
                      onMouseDown={startContinuousCapture}
                      onMouseUp={stopContinuousCapture}
                      onMouseLeave={stopContinuousCapture}
                    >
                      연사하기
                    </button>
                  </div>
                </div>
                <div className="class-card__samples-right">
                  <h4>이미지 샘플 추가:</h4>
                  <div className="class-card__thumbnails">
                    {(sampleImages[className] || []).map((imgUrl, idx) => (
                      <div key={idx} className="thumbnail-container">
                        <img
                          src={imgUrl}
                          alt={`sample-${idx}`}
                          className="class-card__thumbnail"
                        />
                        <button
                          className="thumbnail-delete-btn"
                          onClick={() => deleteSample(className, idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 학습 파라미터 영역 */}
      <div className="train-panel__params">
        <h4 className="train-panel__params-title">학습 파라미터</h4>
        <div className="train-panel__param-group">
          <label className="train-panel__param-label">Hidden Units:</label>
          <input
            className="train-panel__param-input"
            type="number"
            value={trainingParams.hiddenUnits}
            onChange={(e) =>
              setTrainingParams({
                ...trainingParams,
                hiddenUnits: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="train-panel__param-group">
          <label className="train-panel__param-label">Learning Rate:</label>
          <input
            className="train-panel__param-input"
            type="number"
            step="0.0001"
            value={trainingParams.learningRate}
            onChange={(e) =>
              setTrainingParams({
                ...trainingParams,
                learningRate: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="train-panel__param-group">
          <label className="train-panel__param-label">Epochs:</label>
          <input
            className="train-panel__param-input"
            type="number"
            value={trainingParams.epochs}
            onChange={(e) =>
              setTrainingParams({
                ...trainingParams,
                epochs: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="train-panel__param-group">
          <label className="train-panel__param-label">Batch Size:</label>
          <input
            className="train-panel__param-input"
            type="number"
            value={trainingParams.batchSize}
            onChange={(e) =>
              setTrainingParams({
                ...trainingParams,
                batchSize: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      {/* 학습/예측 버튼 영역 */}
      <div className="train-panel__buttons">
        <button className="train-panel__btn" onClick={trainModel}>
          모델 학습
        </button>
        <button className="train-panel__btn" onClick={predict}>
          예측
        </button>
      </div>

      {/* 예측 모드 오버레이 */}
      {isPredicting && (
        <div className="prediction-overlay">
          <div className="prediction-overlay__content">
            <h3>실시간 예측</h3>
            <video
              ref={predictionVideoRef}
              autoPlay
              playsInline
              muted
              className="prediction-overlay__video"
            />
            <div className="prediction-overlay__bar">
              {classes.map((cls, idx) => (
                <div key={cls.className} className="prediction-bar">
                  <span className="prediction-bar__label">
                    {editedNames[cls.className]}
                  </span>
                  <div className="prediction-bar__container">
                    <div
                      className="prediction-bar__fill"
                      style={{
                        width: predictionResult[idx]
                          ? `${(predictionResult[idx] * 100).toFixed(1)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="prediction-bar__percent">
                    {predictionResult[idx]
                      ? `${(predictionResult[idx] * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
              ))}
            </div>
            <button className="train-panel__btn" onClick={stopPrediction}>
              예측 종료
            </button>
          </div>
        </div>
      )}

      {/* 숨김 캡처용 canvas */}
      <canvas ref={canvasRef} width="224" height="224" style={{ display: "none" }} />
    </div>
  );
};

export default TrainPanel;
