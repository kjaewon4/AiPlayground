import React, {useState, useEffect} from "react";
import {getProjects, createProject} from "../services/projectService";
import {Link} from "react-router-dom";
import "./ProjectList.css";

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState("");

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            await createProject(newProjectName);
            setNewProjectName("");
            loadProjects();
        } catch (err) {
            alert("프로젝트 생성 실패: " + err.message);
        }
    };

    return (
        <div className="project-list">
            <h1 className="project-list__title">프로젝트 목록</h1>
            {/* <div className="project-list__create">
        <input
          type="text"
          placeholder="새 프로젝트 이름"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="project-list__input"
        />
        <button className="project-list__button" onClick={handleCreateProject}>생성</button>
      </div> */}
            <div className="project-list__cards">
                {projects.map((project) => (
                    <div key={project.id} className="project-list__card">
                        <Link className="project-list__link" to={`/projects/${project.id}`}>
                            <img
                                className="project-list__card-image"
                                src={project.thumbnail}
                                alt={`${project.projectName} 썸네일`}
                            />
                            <h2 className="project-list__card-title">
                                {project.projectName}
                            </h2>
                            <p>{project.explanation}</p>
                            {/* 필요한 경우 프로젝트 설명이나 썸네일 추가 */}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectList;
