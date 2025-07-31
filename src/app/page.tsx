'use client'
import React, { useState, useEffect, useRef } from "react";

export default function CookingTimer() {
  const [food, setFood] = useState<string>("rice");
  const [weight, setWeight] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCooking, setIsCooking] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [relayOn, setRelayOn] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<string | null>(null);

  // For manual mode elapsed timer counting up
  const manualElapsedRef = useRef<number>(0);
  const manualIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const ESP32_IP = "192.168.70.184";

  // Estimate cooking time based on food and weight
  const estimateTime = () => {
    const w = parseFloat(weight);
    let t = 0;

    if (food === "other") {
      t = parseFloat(manualTime);
    } else if (food === "rice") {
      t = w * 0.06;
    } else if (food === "chicken") {
      t = w * 0.12;
    } else if (food === "potatoes") {
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

  // Fetch status from ESP32
  const fetchStatus = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();

      setRelayOn(data.relay);
      setManualMode(data.manualMode);
      setIsCooking(data.cooking);

      if (data.manualMode) {
        // Manual mode: count up elapsed time
        if (!manualIntervalRef.current) {
          manualElapsedRef.current = data.timeLeft;
          setCountdown(data.timeLeft);
          manualIntervalRef.current = setInterval(() => {
            manualElapsedRef.current++;
            setCountdown(manualElapsedRef.current);
          }, 1000);
        }
      } else {
        // Timer mode: count down timeLeft
        if (manualIntervalRef.current) {
          clearInterval(manualIntervalRef.current);
          manualIntervalRef.current = null;
        }
        setCountdown(data.timeLeft > 0 ? data.timeLeft : null);

        // If relay off or timeLeft 0, clear cooking states
        if (!data.relay || data.timeLeft === 0) {
          setIsCooking(false);
          setCountdown(null);
        }
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      setRelayOn(false);
      setManualMode(false);
      setIsCooking(false);
      setCountdown(null);
      if (manualIntervalRef.current) {
        clearInterval(manualIntervalRef.current);
        manualIntervalRef.current = null;
      }
    }
  };

  // Fetch temperature from ESP32
  const fetchTemperature = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/temperature`);
      if (!res.ok) throw new Error("Failed to fetch temperature");
      const temp = await res.text();
      setTemperature(temp);
    } catch {
      setTemperature(null);
    }
  };

  // Start cooking via web API
  const startCooking = async () => {
    if (!estimatedTime) return;
    try {
      const res = await fetch(`http://${ESP32_IP}/start-cooking`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `seconds=${estimatedTime}`,
      });
      const result = await res.text();
      if (res.ok) {
        alert("Cooking started on ESP32!");
        fetchStatus();
      } else {
        alert("Failed to start cooking: " + result);
      }
    } catch (error) {
      console.error("Error starting cooking:", error);
      alert("Failed to communicate with ESP32");
    }
  };

  // Stop cooking via web API
  const stopCooking = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop-cooking`);
      const result = await res.text();
      if (res.ok) {
        alert("Cooking stopped");
        fetchStatus();
        if (manualIntervalRef.current) {
          clearInterval(manualIntervalRef.current);
          manualIntervalRef.current = null;
        }
      } else {
        alert("Failed to stop cooking: " + result);
      }
    } catch (error) {
      console.error("Error stopping cooking:", error);
      alert("Failed to stop cooking");
    }
  };

  // Poll status every 1 second
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => {
      clearInterval(interval);
      if (manualIntervalRef.current) {
        clearInterval(manualIntervalRef.current);
        manualIntervalRef.current = null;
      }
    };
  }, []);

  // Poll temperature every 3 seconds
  useEffect(() => {
    fetchTemperature();
    const interval = setInterval(fetchTemperature, 3000);
    return () => clearInterval(interval);
  }, []);

  // Local countdown decrement for timer mode (optional)
  useEffect(() => {
    if (isCooking && countdown !== null && !manualMode && countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => (prev !== null ? prev - 1 : null)), 1000);
      return () => clearTimeout(timer);
    }
  }, [isCooking, countdown, manualMode]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} min ${sec < 10 ? "0" : ""}${sec} sec`;
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20, fontFamily: "Arial" }}>
      <h1>Smart Cooking Timer</h1>

      <label>Food Type:</label>
      <select
        value={food}
        onChange={(e) => {
          setFood(e.target.value);
          setEstimatedTime(null);
          setCountdown(null);
          setIsCooking(false);
        }}
        style={{ width: "100%", marginBottom: 15, padding: 8 }}
        disabled={relayOn}
      >
        <option value="rice">Rice</option>
        <option value="chicken">Chicken</option>
        <option value="potatoes">Potatoes</option>
        <option value="other">Other</option>
      </select>

      {food !== "other" ? (
        <label>
          Weight (grams):
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 500"
            style={{ width: "100%", marginBottom: 15, padding: 8 }}
            disabled={relayOn}
          />
        </label>
      ) : (
        <label>
          Manual Time (minutes):
          <input
            type="number"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            placeholder="e.g. 10"
            style={{ width: "100%", marginBottom: 15, padding: 8 }}
            disabled={relayOn}
          />
        </label>
      )}

      <button
        onClick={estimateTime}
        style={{
          width: "100%",
          padding: 12,
          backgroundColor: "#4CAF50",
          color: "white",
          fontWeight: "bold",
          border: "none",
          marginBottom: 15,
          cursor: relayOn ? "not-allowed" : "pointer",
          opacity: relayOn ? 0.6 : 1,
        }}
        disabled={relayOn}
      >
        Estimate Time
      </button>

      {estimatedTime !== null && !isCooking && !relayOn && (
        <>
          <p style={{ fontWeight: "bold", color: "green" }}>Estimated Time: {formatTime(estimatedTime)}</p>
          <button
            onClick={startCooking}
            style={{
              width: "100%",
              padding: 12,
              backgroundColor: "#2196F3",
              color: "white",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
            }}
          >
            Start Cooking
          </button>
        </>
      )}

      {(isCooking || manualMode) && (
        <>
          <p
            style={{
              fontSize: 18,
              marginTop: 20,
              color: manualMode ? "#27ae60" : "#E67E22",
              fontWeight: "bold",
            }}
          >
            {manualMode
              ? `🔌 Manual mode ON - Elapsed time: ${formatTime(countdown ?? 0)}`
              : `⏳ Cooking... Time left: ${formatTime(countdown ?? 0)}`}
          </p>
          <button
            onClick={stopCooking}
            style={{
              width: "100%",
              padding: 12,
              backgroundColor: "#E74C3C",
              color: "white",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            Stop Cooking
          </button>
        </>
      )}

      {!relayOn && <p>Cooking is OFF</p>}

      {temperature !== null && (
        <p style={{ marginTop: 20, fontSize: 16, fontWeight: "bold" }}>🌡️ Current Temperature: {temperature} °C</p>
      )}
    </div>
  );
}
