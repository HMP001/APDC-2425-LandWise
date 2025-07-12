import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import './Event.css';

const dummyEvents = [
  {
    title: "LandWise Expo 2024",
    description: "A showcase of sustainable agriculture and smart farming technologies.",
    date: "2024-07-15",
    location: "Green Valley Convention Center",
    image: "/event1.jpg"
  },
  {
    title: "Community Tree Planting",
    description: "Join us for a day of planting trees and learning about reforestation.",
    date: "2024-08-02",
    location: "Riverbank Park",
    image: "/event2.jpg"
  },
  {
    title: "Organic Market Fair",
    description: "Discover local organic produce and eco-friendly products.",
    date: "2024-08-20",
    location: "Downtown Plaza",
    image: "/event3.jpg"
  }
];

export default function Event() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events from a mock API or static source
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events'); // Replace with actual API endpoint
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div>
      <TopBar navigate={navigate} title="Events" />
      <div className="event-container">
        <h1>Upcoming Events</h1>
        <div className="event-list">
          {dummyEvents.map((event, index) => (
            <div key={index} className="event-item">
              <img src={event.image} alt={event.title} className="event-img" />
              <div className="event-info">
                <h2>{event.title}</h2>
                <p className="event-date">{new Date(event.date).toLocaleDateString()} &mdash; {event.location}</p>
                <p>{event.description}</p>
                <button className="event-subscribe-btn">Subscribe</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}