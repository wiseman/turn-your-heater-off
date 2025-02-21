import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HouseHeatingSimulation = () => {
  // Simulation parameters
  const [outsideTemp, setOutsideTemp] = useState(30); // °F
  const [desiredTemp, setDesiredTemp] = useState(68); // °F
  const [insulation, setInsulation] = useState(5); // R-value multiplier (higher = better insulation)
  const [mode, setMode] = useState(1); // 1 = 24hr, 2 = night setback
  const [simulationData, setSimulationData] = useState([]);
  const [summary, setSummary] = useState({ mode1Energy: 0, mode2Energy: 0, savings: 0 });

  // Constants
  const MINUTES_PER_STEP = 1; // 1 minute per step
  const STEPS_PER_HOUR = 60 / MINUTES_PER_STEP;
  const HOURS_SIMULATED = 24;
  const TOTAL_STEPS = HOURS_SIMULATED * STEPS_PER_HOUR;
  const HEATER_OUTPUT = 20000; // BTU per hour
  const HOUSE_HEAT_CAPACITY = 4000; // BTU per °F
  const THERMOSTAT_HYSTERESIS = 1; // °F (±0.5°F from setpoint)

  const runSimulation = () => {
    // Initialize simulation
    let currentTemp = desiredTemp;
    let heaterOn = false;
    let totalEnergyUsed = 0;
    const data = [];
    
    // Calculate heat loss coefficient based on insulation value
    // Lower insulation = faster heat loss
    const heatLossCoefficient = 1000 / insulation;

    for (let step = 0; step < TOTAL_STEPS; step++) {
      const hour = Math.floor(step / STEPS_PER_HOUR);
      const minute = (step % STEPS_PER_HOUR) * MINUTES_PER_STEP;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if we should be heating based on the mode
      let targetTemp = desiredTemp;
      let heatingDisabled = false;
      
      if (mode === 2) {
        // For mode 2, disable heating between 10PM (22:00) and 8AM (08:00)
        if (hour >= 22 || hour < 8) {
          heatingDisabled = true;
          targetTemp = 55; // Setback temperature
        }
      }
      
      // Bang-bang controller with hysteresis
      if (!heatingDisabled) {
        if (currentTemp < targetTemp - THERMOSTAT_HYSTERESIS/2) {
          heaterOn = true;
        } else if (currentTemp > targetTemp + THERMOSTAT_HYSTERESIS/2) {
          heaterOn = false;
        }
      } else {
        heaterOn = false;
      }
      
      // Calculate temperature change
      // Heat loss is proportional to the difference between inside and outside temps
      const heatLoss = (currentTemp - outsideTemp) * heatLossCoefficient / STEPS_PER_HOUR;
      
      // Heat added by the heater (if on)
      const heatAdded = heaterOn ? HEATER_OUTPUT / STEPS_PER_HOUR : 0;
      
      // Update the current temperature
      const tempChange = (heatAdded - heatLoss) / HOUSE_HEAT_CAPACITY;
      currentTemp += tempChange;
      
      // Track energy used
      if (heaterOn) {
        totalEnergyUsed += HEATER_OUTPUT / STEPS_PER_HOUR;
      }
      
      // Store data point
      data.push({
        time: timeString,
        hour,
        temperature: parseFloat(currentTemp.toFixed(2)),
        outsideTemp,
        heaterOn,
        energyUsed: totalEnergyUsed,
      });
    }
    
    setSimulationData(data);
    
    // Run the opposite mode simulation for comparison
    const otherMode = mode === 1 ? 2 : 1;
    let otherTemp = desiredTemp;
    let otherHeaterOn = false;
    let otherEnergyUsed = 0;
    
    for (let step = 0; step < TOTAL_STEPS; step++) {
      const hour = Math.floor(step / STEPS_PER_HOUR);
      
      // Check if we should be heating based on the mode
      let otherTargetTemp = desiredTemp;
      let otherHeatingDisabled = false;
      
      if (otherMode === 2) {
        // For mode 2, disable heating between 10PM (22:00) and 8AM (08:00)
        if (hour >= 22 || hour < 8) {
          otherHeatingDisabled = true;
          otherTargetTemp = 55; // Setback temperature
        }
      }
      
      // Bang-bang controller with hysteresis
      if (!otherHeatingDisabled) {
        if (otherTemp < otherTargetTemp - THERMOSTAT_HYSTERESIS/2) {
          otherHeaterOn = true;
        } else if (otherTemp > otherTargetTemp + THERMOSTAT_HYSTERESIS/2) {
          otherHeaterOn = false;
        }
      } else {
        otherHeaterOn = false;
      }
      
      // Calculate temperature change
      const otherHeatLoss = (otherTemp - outsideTemp) * heatLossCoefficient / STEPS_PER_HOUR;
      const otherHeatAdded = otherHeaterOn ? HEATER_OUTPUT / STEPS_PER_HOUR : 0;
      const otherTempChange = (otherHeatAdded - otherHeatLoss) / HOUSE_HEAT_CAPACITY;
      otherTemp += otherTempChange;
      
      // Track energy used
      if (otherHeaterOn) {
        otherEnergyUsed += HEATER_OUTPUT / STEPS_PER_HOUR;
      }
    }
    
    // Calculate savings
    const mode1Energy = mode === 1 ? totalEnergyUsed : otherEnergyUsed;
    const mode2Energy = mode === 2 ? totalEnergyUsed : otherEnergyUsed;
    const savings = ((mode1Energy - mode2Energy) / mode1Energy * 100).toFixed(2);
    
    setSummary({
      mode1Energy: mode1Energy.toFixed(0),
      mode2Energy: mode2Energy.toFixed(0),
      savings
    });
  };

  // Format data for chart
  const getChartData = () => {
    // Sample every 30 minutes to keep chart readable
    return simulationData.filter((_, index) => index % 30 === 0);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">House Heating Simulation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outside Temperature (°F): {outsideTemp}°F
            </label>
            <input
              type="range"
              min="-20"
              max="60"
              value={outsideTemp}
              onChange={(e) => setOutsideTemp(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Inside Temperature (°F): {desiredTemp}°F
            </label>
            <input
              type="range"
              min="50"
              max="80"
              value={desiredTemp}
              onChange={(e) => setDesiredTemp(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insulation Efficiency (1-10): {insulation}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={insulation}
              onChange={(e) => setInsulation(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">(Higher values = better insulation)</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Heating Mode:</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="mode1"
                  name="mode"
                  checked={mode === 1}
                  onChange={() => setMode(1)}
                  className="mr-2"
                />
                <label htmlFor="mode1">Mode 1: 24-hour heating (constant)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="mode2"
                  name="mode"
                  checked={mode === 2}
                  onChange={() => setMode(2)}
                  className="mr-2"
                />
                <label htmlFor="mode2">Mode 2: Night setback (off 10PM-8AM)</label>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={runSimulation}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Run Simulation
            </button>
          </div>
          
          {simulationData.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <h3 className="font-medium mb-2">Simulation Results:</h3>
              <p>Mode 1 Energy: {summary.mode1Energy} BTU</p>
              <p>Mode 2 Energy: {summary.mode2Energy} BTU</p>
              <p className="font-bold">
                {summary.savings > 0 
                  ? `Mode 2 saves ${summary.savings}% energy`
                  : `Mode 1 is more efficient by ${Math.abs(summary.savings)}%`
                }
              </p>
            </div>
          )}
        </div>
      </div>
      
      {simulationData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Temperature Over 24 Hours</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  interval={7} 
                  label={{ value: 'Time', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft' }} 
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'temperature') return [`${value}°F`, 'Inside Temp'];
                    if (name === 'outsideTemp') return [`${value}°F`, 'Outside Temp'];
                    if (name === 'heaterOn') return [value ? 'On' : 'Off', 'Heater'];
                    return [value, name];
                  }}
                  labelFormatter={(time) => `Time: ${time}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Inside Temp"
                />
                <Line 
                  type="monotone" 
                  dataKey="outsideTemp" 
                  stroke="#82ca9d" 
                  strokeWidth={2} 
                  dot={false}
                  name="Outside Temp"
                />
                <Line 
                  type="step" 
                  dataKey="heaterOn" 
                  stroke="#ff7300" 
                  strokeWidth={1.5}
                  dot={false}
                  name="Heater Status"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Cumulative Energy Usage</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  interval={7} 
                  label={{ value: 'Time', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: 'Energy (BTU)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value) => [`${parseInt(value).toLocaleString()} BTU`, 'Energy Used']}
                  labelFormatter={(time) => `Time: ${time}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="energyUsed" 
                  stroke="#ff5500" 
                  strokeWidth={2} 
                  dot={false}
                  name="Energy Used"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseHeatingSimulation;