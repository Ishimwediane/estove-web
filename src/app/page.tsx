'use client';
import React, { useState, useEffect } from 'react';

export default function CookingTimer() {
  const [food, setFood] = useState<string>('rice');
  const [weight, setWeight] = useState<string>('');
  const [manualTime, setManualTime] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCooking, setIsCooking] = useState<boolean>(false);

  // ✅ Change this to your ESP32 IP
  const ESP32_IP = '192.168.1.150';

  const estimateTime = () => {
    const w = parseFloat(weight);
    let t = 0;

    if (food === 'other') {
      t = parseFloat(manualTime);
    } else if (food === 'rice') {
      t = w * 0.06;
    } else if (food === 'chicken') {
      t = w * 0.12;
    } else if (food === 'potatoes') {
      t = w * 0.08;
    }

    if (!isNaN(t) && t > 0) {
      const seconds = Math.floor(t * 60);
      setEstimatedTime(seconds);
      setCountdown(null);
      setIsCooking(false);
    } else {
      setEstimatedTime(null);
      setCountdown(null);
      setIsCooking(false);
    }
  };

  const startCooking = async () => {
    if (!estimatedTime) return;
    setCountdown(estimatedTime);
    setIsCooking(true);

    try {
      const response = await fetch(`http://${ESP32_IP}/start-cooking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `seconds=${estimatedTime}`
      });
      const result = await response.text();
      console.log('ESP32 says:', result);
      alert('✅ Cooking started on ESP32!');
    } catch (error) {
      console.error('Error sending to ESP32:', error);
      alert('❌ Failed to communicate with ESP32.');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCooking && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => (prev !== null ? prev - 1 : null)), 1000);
    } else if (isCooking && countdown === 0) {
      setIsCooking(false);
      alert('✅ Cooking Complete!');
    }
    return () => clearTimeout(timer);
  }, [isCooking, countdown]);

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} min ${sec < 10 ? '0' : ''}${sec} sec`;
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', fontFamily: 'Arial' }}>
      <h1>Smart Cooking Timer</h1>

      <label>Select Food Type:</label>
      <select
        value={food}
        onChange={(e) => {
          setFood(e.target.value);
          setEstimatedTime(null);
          setCountdown(null);
          setIsCooking(false);
        }}
        style={{ width: '100%', marginBottom: '15px', padding: '8px' }}
      >
        <option value="rice">Rice</option>
        <option value="chicken">Chicken</option>
        <option value="potatoes">Potatoes</option>
        <option value="other">Other</option>
      </select>

      {food !== 'other' && (
        <>
          <label>Weight (grams):</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 500"
            style={{ width: '100%', marginBottom: '15px', padding: '8px' }}
          />
        </>
      )}

      {food === 'other' && (
        <>
          <label>Manual Time (minutes):</label>
          <input
            type="number"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            placeholder="e.g. 10"
            style={{ width: '100%', marginBottom: '15px', padding: '8px' }}
          />
        </>
      )}

      <button
        onClick={estimateTime}
        style={{
          width: '100%',
          padding: '12px',
          background: '#4CAF50',
          color: 'white',
          fontWeight: 'bold',
          border: 'none',
          marginBottom: '15px',
          cursor: 'pointer'
        }}
      >
        Estimate Time
      </button>

      {estimatedTime !== null && !isCooking && (
        <>
          <p style={{ fontWeight: 'bold', color: 'green' }}>
            Estimated Time: {formatTime(estimatedTime)}
          </p>
          <button
            onClick={startCooking}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2196F3',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Start Cooking
          </button>
        </>
      )}

      {isCooking && countdown !== null && (
        <p style={{ fontSize: '18px', marginTop: '20px', color: '#E67E22', fontWeight: 'bold' }}>
          ⏳ Cooking… Time left: {formatTime(countdown)}
        </p>
      )}
    </div>
  );
}
