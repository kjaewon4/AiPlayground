export const getProjects = async () => {
    // 실제 API 호출로 교체할 부분
    return [
        {
            id: 1,
            projectName: "이미지 학습",
            explanation:
                "웹캠/로컬 이미지로 객체를 학습, 분류하는 딥러닝 모델. 실시간 데이터 수집과 학습 과정을 직관적으로 확인할 수 있습니다.",
            thumbnail: "/images/imageTrainingThumbnail.png",
        },
        {id: 2, projectName: "동작 학습"},
    ];
};

export const createProject = async (projectName) => {
    // 실제 API 호출 시: POST /api/projects
    return {id: Math.floor(Math.random() * 1000), projectName};
};

export const getProjectClasses = async (projectId) => {
    // 실제 API 호출로 교체
    return [
        {id: 1, className: "class1", sampleCount: 0},
        {id: 2, className: "class2", sampleCount: 0},
    ];
};

export const addClass = async (projectId, className) => {
    // 실제 API 호출 시: POST /api/projects/{projectId}/classes
    return {id: Math.floor(Math.random() * 1000), className, sampleCount: 0};
};
