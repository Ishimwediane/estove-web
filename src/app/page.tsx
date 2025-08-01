'use client'
import React, { useState, useEffect, useRef } from "react";

// Language translations
const translations = {
  en: {
    title: "Welcome to Electronic Oven",
    foodType: "Food Type:",
    weight: "Weight (grams):",
    manualTime: "Manual Time (minutes):",
    estimateTime: "Estimate Time",
    estimatedTime: "Estimated Time:",
    startCooking: "Start Cooking",
    stopCooking: "Stop Cooking",
    cooking: "Cooking... Time left:",
    manualMode: "Manual mode ON - Elapsed time:",
    cookingOff: "Cooking is OFF",
    currentTemperature: "Current Temperature:",
    weightPlaceholder: "e.g. 500",
    timePlaceholder: "e.g. 10",
    bread: "Bread",
    chicken: "Chicken",
    potatoes: "Potatoes",
    pizza: "Pizza",
    other: "Other",
    language: "Language",
    status: "Status",
    cookingStatus: "Cooking:",
    systemInfo: "System Info",
    mode: "Mode:",
    foodTypeLabel: "Food Type:",
    timeLabel: "Time:",
    active: "Active",
    manual: "Manual",
    timer: "Timer",
    error: "Error",
    success: "Success",
    connecting: "Connecting..."
  },
  rw: {
    title: "Murakaza neza kuri Four yo Guteka ya Elektroniki",
    foodType: "Ubwoko bw'ibiryo:",
    weight: "Uburemere (gramu):",
    manualTime: "Igihe cy'ubwenge (iminota):",
    estimateTime: "Gereranya Igihe",
    estimatedTime: "Igihe cyo Gereranywa:",
    startCooking: "Tangira Guteka",
    stopCooking: "Hagarika Guteka",
    cooking: "Guteka... Igihe gisigaye:",
    manualMode: "Uburyo bw'ubwenge BUKIRI - Igihe cyo gutangira:",
    cookingOff: "Guteka BIHAGARITSE",
    currentTemperature: "Ubushyuhe bwo kugeza ubu:",
    weightPlaceholder: "urugero: 500",
    timePlaceholder: "urugero: 10",
    bread: "Umugati",
    chicken: "Inkoko",
    potatoes: "Ibirayi",
    pizza: "Pizza",
    other: "Ibindi",
    language: "Ururimi",
    status: "Imiterere",
    cookingStatus: "Guteka:",
    systemInfo: "Amakuru ya Sisitemu",
    mode: "Uburyo:",
    foodTypeLabel: "Ubwoko bw'ibiryo:",
    timeLabel: "Igihe:",
    active: "Bikora",
    manual: "Ubwenge",
    timer: "Timer",
    error: "Ikosa",
    success: "Intsinzi",
    connecting: "Ihuza..."
  }
};

export default function CookingTimer() {
  const [language, setLanguage] = useState<'en' | 'rw'>('en');
  const [food, setFood] = useState<string>("bread");
  const [weight, setWeight] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCooking, setIsCooking] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [relayOn, setRelayOn] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = translations[language];

  // For manual mode elapsed timer counting up
  const manualElapsedRef = useRef<number>(0);
  const manualIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Server API URL
  const SERVER_URL = 'https://estove-server-1.onrender.com';

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Estimate cooking time based on food and weight
  const estimateTime = () => {
    const w = parseFloat(weight);
    let t = 0;

    if (food === "other") {
      t = parseFloat(manualTime);
    } else if (food === "bread") {
      t = w * 0.04;
    } else if (food === "chicken") {
      t = w * 0.12;
    } else if (food === "potatoes") {
      t = w * 0.08;
    } else if (food === "pizza") {
      t = w * 0.05;
    }

    if (!isNaN(t) && t > 0) {
      const seconds = Math.floor(t * 60);
      setEstimatedTime(seconds);
      setCountdown(null);
      setIsCooking(false);
      setError(null);
    } else {
      setEstimatedTime(null);
      setCountdown(null);
      setIsCooking(false);
      setError("Please enter valid weight/time values");
    }
  };

  // Fetch latest status from server
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/stove-data/latest`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();

      if (data.message === 'No data available') {
        setRelayOn(false);
        setManualMode(false);
        setIsCooking(false);
        setCountdown(null);
        setTemperature(null);
        return;
      }

      const wasCooking = isCooking;
      setRelayOn(data.relay);
      setManualMode(data.manualMode);
      setIsCooking(data.cooking);
      setTemperature(data.temperature ? `${data.temperature}` : null);

      // Check if cooking just finished
      if (wasCooking && !data.cooking && !data.manualMode) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cooking Complete! 🎉', {
            body: 'Your food is ready!',
            icon: '🍽️'
          });
        }
        setSuccess("Cooking completed successfully!");
      }

      if (data.manualMode) {
        if (!manualIntervalRef.current) {
          manualElapsedRef.current = data.timeLeft;
          setCountdown(data.timeLeft);
          manualIntervalRef.current = setInterval(() => {
            manualElapsedRef.current++;
            setCountdown(manualElapsedRef.current);
          }, 1000);
        }
      } else {
        if (manualIntervalRef.current) {
          clearInterval(manualIntervalRef.current);
          manualIntervalRef.current = null;
        }
        setCountdown(data.timeLeft > 0 ? data.timeLeft : null);

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

  // Start cooking
  const startCooking = async () => {
    if (!estimatedTime) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${SERVER_URL}/api/start-cooking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seconds: estimatedTime,
          foodType: food,
          weight: weight
        }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cooking Started! 🍳', {
            body: `Cooking started for ${formatTime(estimatedTime)}`,
            icon: '🍳'
          });
        }
        
        setIsCooking(true);
        setCountdown(estimatedTime);
        setSuccess("Cooking started successfully!");
        
        // Refresh status to get latest data
        fetchStatus();
      } else {
        console.error("Failed to start cooking:", result);
        setError(result.error || 'Failed to start cooking');
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cooking Start Failed! ❌', {
            body: result.error || 'Failed to start cooking',
            icon: '❌'
          });
        }
      }
    } catch (error) {
      console.error("Error starting cooking:", error);
      setError('Network error - please check your connection');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cooking Start Failed! ❌', {
          body: 'Network error - please check your connection',
          icon: '❌'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Stop cooking
  const stopCooking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${SERVER_URL}/api/stop-cooking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await res.json();
      
      if (res.ok) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cooking Stopped! ⏹️', {
            body: 'Cooking stopped successfully',
            icon: '⏹️'
          });
        }
        
        setIsCooking(false);
        setCountdown(null);
        if (manualIntervalRef.current) {
          clearInterval(manualIntervalRef.current);
          manualIntervalRef.current = null;
        }
        
        setSuccess("Cooking stopped successfully!");
        
        // Refresh status to get latest data
        fetchStatus();
      } else {
        console.error("Failed to stop cooking:", result);
        setError(result.error || 'Failed to stop cooking');
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cooking Stop Failed! ❌', {
            body: result.error || 'Failed to stop cooking',
            icon: '❌'
          });
        }
      }
    } catch (error) {
      console.error("Error stopping cooking:", error);
      setError('Network error - please check your connection');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cooking Stop Failed! ❌', {
          body: 'Network error - please check your connection',
          icon: '❌'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll status every 2 seconds from server
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => {
      clearInterval(interval);
      if (manualIntervalRef.current) {
        clearInterval(manualIntervalRef.current);
        manualIntervalRef.current = null;
      }
    };
  }, []);

  // Local countdown decrement for timer mode
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>{t.error}:</strong> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <strong>{t.success}:</strong> {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Controls */}
          <div className="lg:col-span-2">
            {/* Header with Language Switcher */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">{t.language}:</span>
                  <div className="flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-1.5 py-0.5 w-12 rounded text-xs font-medium transition-colors ${
                        language === 'en' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('rw')}
                      className={`px-1.5 py-0.5 w-12 rounded text-xs font-medium transition-colors ${
                        language === 'rw' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      RW
                    </button>
                  </div>
                </div>
              </div>

              {/* Food Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.foodType}
                </label>
                <select
                  value={food}
                  onChange={(e) => {
                    setFood(e.target.value);
                    setEstimatedTime(null);
                    setCountdown(null);
                    setIsCooking(false);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={relayOn}
                >
                  <option value="bread">{t.bread}</option>
                  <option value="chicken">{t.chicken}</option>
                  <option value="potatoes">{t.potatoes}</option>
                  <option value="pizza">{t.pizza}</option>
                  <option value="other">{t.other}</option>
                </select>
              </div>

              {/* Weight/Time Input */}
              <div className="mb-6">
                {food !== "other" ? (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.weight}
                  </label>
                ) : (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.manualTime}
                  </label>
                )}
                <input
                  type="number"
                  value={food !== "other" ? weight : manualTime}
                  onChange={(e) => {
                    food !== "other" ? setWeight(e.target.value) : setManualTime(e.target.value);
                    setError(null);
                  }}
                  placeholder={food !== "other" ? t.weightPlaceholder : t.timePlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={relayOn}
                />
              </div>

              {/* Estimate Time Button */}
              <button
                onClick={estimateTime}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={relayOn}
              >
                {t.estimateTime}
              </button>
            </div>

            {/* Estimated Time Display */}
            {estimatedTime !== null && !isCooking && !relayOn && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <p className="text-lg font-bold text-green-600 mb-4">
                  {t.estimatedTime} {formatTime(estimatedTime)}
                </p>
                <button
                  onClick={startCooking}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? t.connecting : t.startCooking}
                </button>
              </div>
            )}

            {/* Cooking Status */}
            {(isCooking || manualMode) && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <div className={`text-lg font-bold mb-4 ${
                  manualMode ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {manualMode
                    ? `🔌 ${t.manualMode} ${formatTime(countdown ?? 0)}`
                    : `⏳ ${t.cooking} ${formatTime(countdown ?? 0)}`}
                </div>
                <button
                  onClick={stopCooking}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? t.connecting : t.stopCooking}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Status and Temperature */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Status Indicators */}
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">{t.status}</h2>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">{t.cookingStatus}</span>
                  <div className={`flex items-center space-x-2 ${
                    relayOn ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      relayOn ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-semibold">
                      {relayOn ? (manualMode ? t.manual : t.active) : t.cookingOff}
                    </span>
                  </div>
                </div>

                {/* Temperature Display */}
                {temperature !== null && (
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <div className="text-2xl">🌡️</div>
                    <div>
                      <div className="text-sm text-gray-600">{t.currentTemperature}</div>
                      <div className="text-xl font-bold text-blue-600">{temperature} °C</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Status Info */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">{t.systemInfo}</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t.mode}</span>
                    <span className="font-semibold text-gray-800">
                      {manualMode ? t.manual : t.timer}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t.foodTypeLabel}</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {t[food as keyof typeof t]}
                    </span>
                  </div>
                  {countdown !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t.timeLabel}</span>
                      <span className="font-semibold text-gray-800">
                        {formatTime(countdown)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
