// src/components/TrainPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-vis";
import "./TrainPanel.css";

const FEATURE_SIZE = 1280; // MobileNet 출력 차원

const TrainPanel = ({ projectId, classes }) => {
  // 웹캠 모달 내 video 요소 참조
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [mobilenet, setMobilenet] = useState(null); // MobileNet 특징 추출 모델
  const [samples, setSamples] = useState({}); // 각 클래스별 샘플(특징 텐서) 저장
  const [model, setModel] = useState(null); // 학습한 분류기 모델
  const [trainingParams, setTrainingParams] = useState({
    hiddenUnits: 100,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 8,
  });

  // 클래스 이름 수정 관련 상태
  const [editMode, setEditMode] = useState({});
  const [editedNames, setEditedNames] = useState({});

  // 각 클래스별 샘플 및 이름 초기화
  useEffect(() => {
    const initSamples = {};
    const initEdit = {};
    const initNames = {};
    classes.forEach((cls) => {
      initSamples[cls.className] = [];
      initEdit[cls.className] = false;
      initNames[cls.className] = cls.className;
    });
    setSamples(initSamples);
    setEditMode(initEdit);
    setEditedNames(initNames);
  }, [classes]);

  // MobileNet 모델 로드 (모델은 Graph Model 형식)
  useEffect(() => {
    loadMobilenet();
  }, []);

  const loadMobilenet = async () => {
    const mobilenetURL = "/mobilenet/model.json";
    try {
      // Graph Model 형식으로 로드
      const mobilenetModel = await tf.loadGraphModel(mobilenetURL);
      setMobilenet(mobilenetModel);
      console.log("MobileNet Graph Model 로드 완료");
    } catch (error) {
      console.error("MobileNet 로드 실패:", error);
      alert("로컬 모델을 불러오지 못했습니다. 경로와 모델 형식을 확인하세요.");
    }
  };

  // 기존 캔버스 미리보기 (필요시 사용)
  const captureAndPreview = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, 224, 224);
  };

  // ──────────────────────────────────────────────
  //   웹캠 모달 관련 상태 및 함수
  // ──────────────────────────────────────────────
  const [activeClass, setActiveClass] = useState(null);
  const [webcamStream, setWebcamStream] = useState(null);

  // 각 클래스에 대해 웹캠 모달 열기
  const openWebcamForClass = async (className) => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setWebcamStream(stream);
        setActiveClass(className);
        // 모달 렌더 후 video에 스트림 할당
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((err) => console.error(err));
          }
        }, 100);
      }
    } catch (error) {
      console.error("웹캠 접근 에러:", error);
      alert("카메라 접근 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
    }
  };

  // 웹캠 모달 닫기
  const closeWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setActiveClass(null);
  };

  // 웹캠 모달에서 캡처 및 샘플 저장
  const captureSample = async () => {
    if (!mobilenet || !videoRef.current || !activeClass) return;

    if (
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      alert(
        "웹캠 데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
      );
      return;
    }

    tf.engine().startScope();
    // (선택 사항) captureAndPreview(); // 캔버스에 미리보기
    const img = tf.browser.fromPixels(videoRef.current);
    const resized = tf.image.resizeBilinear(img, [224, 224]);
    const normalized = resized.expandDims(0).toFloat().div(255);
    // Graph Model의 경우 execute()로 원하는 출력 노드를 지정할 수 있음
    // 여기서는 단순히 mobilenet.predict()로 feature를 얻는다고 가정 (필요 시 수정)
    const feature = mobilenet.predict(normalized);

    // squeeze() 후 tf.keep()으로 텐서 유지
    const persistentFeature = tf.keep(feature.squeeze());
    setSamples((prev) => ({
      ...prev,
      [activeClass]: [...prev[activeClass], persistentFeature],
    }));
    tf.engine().endScope();
    alert(`${activeClass} 클래스 샘플 추가됨`);
    closeWebcam();
  };

  // 이미지 업로드 처리 (기존 그대로)
  const handleImageUpload = (className, event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        tf.engine().startScope();
        const tensorImg = tf.browser.fromPixels(img);
        const resized = tf.image.resizeBilinear(tensorImg, [224, 224]);
        const normalized = resized.expandDims(0).toFloat().div(255);
        const feature = mobilenet.predict(normalized);

        // squeeze() 후 tf.keep()으로 텐서 유지
        const persistentFeature = tf.keep(feature.squeeze());
        setSamples((prev) => ({
          ...prev,
          [className]: [...prev[className], persistentFeature],
        }));
        tf.engine().endScope();
        alert(`${className} 클래스 이미지 업로드됨`);
      };
    };
    reader.readAsDataURL(file);
  };

  // MobileNet 특징을 입력으로 받는 간단한 다층 퍼셉트론(MLP) 모델 생성
  const buildClassifier = (numClasses, hiddenUnits, learningRate) => {
    const classifier = tf.sequential();
    classifier.add(
      tf.layers.dense({
        units: hiddenUnits,
        activation: "relu",
        inputShape: [FEATURE_SIZE],
      })
    );
    classifier.add(
      tf.layers.dense({ units: numClasses, activation: "softmax" })
    );
    classifier.compile({
      optimizer: tf.train.adam(learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    return classifier;
  };

  // 모델 학습 함수 (기존 그대로)
  const trainModel = async () => {
    const classNames = Object.keys(samples);
    for (let cls of classNames) {
      if (!samples[cls] || samples[cls].length === 0) {
        alert(`${cls} 클래스에 최소 한 개 이상의 샘플이 필요합니다.`);
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
          console.log(
            `Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`
          );
        },
      },
    });
    trainX.dispose();
    trainY.dispose();
    alert("모델 학습 완료!");
  };

  // 예측 함수 (기존 그대로)
  const predict = async () => {
    if (!model || !mobilenet || !videoRef.current) {
      alert("모델 학습이 완료되지 않았습니다.");
      return;
    }
    tf.engine().startScope();
    const img = tf.browser.fromPixels(videoRef.current);
    const resized = tf.image.resizeBilinear(img, [224, 224]);
    const normalized = resized.expandDims(0).toFloat().div(255);
    const feature = mobilenet.predict(normalized);
    const prediction = model.predict(feature).dataSync();
    tf.engine().endScope();
    alert(`예측 결과: ${JSON.stringify(prediction)}`);
  };

  return (
    <div className="train-panel">
      <h3 className="train-panel__title">학습 패널</h3>

      {/* 클래스별 샘플 그룹 */}
      <div className="train-panel__samples">
        {Object.keys(samples).map((className) => (
          <div key={className} className="train-panel__sample-group">
            <h4 className="train-panel__sample-title">
              {editMode[className] ? (
                <input
                  type="text"
                  value={editedNames[className]}
                  onChange={(e) =>
                    setEditedNames({
                      ...editedNames,
                      [className]: e.target.value,
                    })
                  }
                  onBlur={() =>
                    setEditMode({ ...editMode, [className]: false })
                  }
                  autoFocus
                  className="train-panel__name-input"
                />
              ) : (
                <>
                  {editedNames[className]}
                  <span
                    className="train-panel__edit-icon"
                    onClick={() =>
                      setEditMode({ ...editMode, [className]: true })
                    }
                  >
                    &#9998;
                  </span>
                </>
              )}{" "}
              (샘플 수: {samples[className] ? samples[className].length : 0})
            </h4>
            <div className="train-panel__actions">
              <button
                className="train-panel__btn"
                onClick={() => openWebcamForClass(className)}
              >
                웹캠 샘플 추가
              </button>
              <input
                type="file"
                accept="image/*"
                className="train-panel__file-input"
                onChange={(e) => handleImageUpload(className, e)}
              />
            </div>
          </div>
        ))}
      </div>

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

      {/* 학습 및 예측 버튼 영역 */}
      <div className="train-panel__buttons">
        <button className="train-panel__btn" onClick={trainModel}>
          모델 학습
        </button>
        <button className="train-panel__btn" onClick={predict}>
          예측
        </button>
      </div>

      {/* 웹캠 모달 (activeClass가 있을 때 렌더링) */}
      {activeClass && (
        <div className="webcam-modal">
          <div className="webcam-modal__content">
            <h4>{activeClass} 클래스 웹캠 캡처</h4>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width="224"
              height="224"
              className="webcam-modal__video"
            />
            <div className="webcam-modal__buttons">
              <button className="train-panel__btn" onClick={captureSample}>
                캡처
              </button>
              <button className="train-panel__btn" onClick={closeWebcam}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainPanel;
