import React from 'react';

const TaskItem = ({ task }) => {
  return (
    <div>
      <h3>{task.title}</h3>
      <p>Assigned to: {task.assignee}</p>
      <p>Deadline: {task.deadline}</p>
      <p>Status: {task.status}</p>
    </div>
  );
};

export default TaskItem; 