import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {getProjectClasses, addClass} from '../services/projectService';
import TrainPanel from './TrainPanel';
import './ProjectDetail.css';

const ProjectDetail = () => {
    const {projectId} = useParams();
    const [classes, setClasses] = useState([]);
    const [newClassName, setNewClassName] = useState('');

    useEffect(() => {
        loadClasses();
    }, [projectId]);

    const loadClasses = async () => {
        try {
            const data = await getProjectClasses(projectId);
            setClasses(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        try {
            await addClass(projectId, newClassName);
            setNewClassName('');
            loadClasses();
        } catch (err) {
            alert('클래스 추가 실패: ' + err.message);
        }
    };

    return (
        <div className="project-detail">
            <h2 className="project-detail__title">프로젝트 상세 (ID: {projectId})</h2>
            <div className="project-detail__classes">
                <h3 className="project-detail__subtitle">클래스 목록</h3>
                <div className="project-detail__add-class">
                    <input
                        type="text"
                        placeholder="새 클래스 이름"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="project-detail__input"
                    />
                    <button className="project-detail__button" onClick={handleAddClass}>추가</button>
                </div>
                <ul className="project-detail__class-list">
                    {classes.map((cls) => (
                        <li key={cls.id} className="project-detail__class-item">
                            {cls.className} - 샘플 수: {cls.sampleCount}
                        </li>
                    ))}
                </ul>
            </div>
            <hr className="project-detail__divider"/>
            <TrainPanel projectId={projectId} classes={classes}/>
        </div>
    );
};

export default ProjectDetail;
