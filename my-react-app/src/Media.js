import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import './Media.css';

const dummyMedia = [
  {
    user: "Alice",
    avatar: "/dummy-profile-1.png",
    title: "Sunrise over the fields",
    url: "/dummy-media-1.jpg",
    date: "2024-07-01"
  },
  {
    user: "Bob",
    avatar: "/dummy-profile-2.png",
    title: "Harvest time!",
    url: "/dummy-media-2.jpg",
    date: "2024-07-03"
  },
  {
    user: "Carla",
    avatar: "/dummy-profile-3.png",
    title: "New irrigation system in action",
    url: "/dummy-media-1.jpg",
    date: "2024-07-05"
  }
];

export default function Media() {
  const navigate = useNavigate();

  return (
    <div>
      <TopBar navigate={navigate} title="Media Gallery" />
      <div className="media-container">
        <h1>Media Gallery</h1>
        <div className="media-grid">
          {dummyMedia.map((media, index) => (
            <div key={index} className="media-item">
              <div className="media-header">
                <img src={media.avatar} alt={media.user} className="media-avatar" />
                <span className="media-user">{media.user}</span>
                <span className="media-date">{new Date(media.date).toLocaleDateString()}</span>
              </div>
              <img src={media.url} alt={media.title} className="media-img" />
              <p className="media-title">{media.title}</p>
              <div className="media-actions">
                <button className="media-action-btn" title="Like">👍</button>
                <button className="media-action-btn" title="Comment">💬</button>
                <button className="media-action-btn" title="Share">🔗</button>
                <button className="media-action-btn" title="Subscribe">🔔</button>
                <button className="media-action-btn" title="RTT">🔁</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}