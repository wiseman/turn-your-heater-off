import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const HouseHeatingSimulation = () => {
  // Simulation parameters
  const [outsideTemp, setOutsideTemp] = useState(30); // Base outside temperature (°F)
  const [desiredTemp, setDesiredTemp] = useState(68); // Desired inside temperature (°F)
  const [insulation, setInsulation] = useState(5); // Insulation efficiency (1-10)
  const [mode, setMode] = useState(1); // 1 = 24hr heating, 2 = night setback
  const [diurnalVariation, setDiurnalVariation] = useState(15); // Diurnal variation slider (0-30°F)
  const [simulationData, setSimulationData] = useState([]);
  const [summary, setSummary] = useState({ mode1Energy: 0, mode2Energy: 0, savings: 0 });

  // Constants
  const SECONDS_PER_STEP = 10; // 10 seconds per simulation step
  const STEPS_PER_HOUR = 3600 / SECONDS_PER_STEP; // steps per hour
  const HOURS_SIMULATED = 24;
  const TOTAL_STEPS = HOURS_SIMULATED * STEPS_PER_HOUR;
  const HEATER_OUTPUT = 60000; // BTU per hour
  const HOUSE_HEAT_CAPACITY = 4000; // BTU per °F
  const THERMOSTAT_HYSTERESIS = 1; // °F (±0.5°F around setpoint)

  const runSimulation = () => {
    // Initialize simulation for the selected mode
    let currentTemp = desiredTemp;
    let heaterOn = false;
    let totalEnergyUsed = 0;
    const data = [];

    // Determine heat loss coefficient (BTU/hr per °F difference)
    const heatLossCoefficient = 1000 / insulation;

    for (let step = 0; step < TOTAL_STEPS; step++) {
      // Time in hours (with fractional part)
      const timeInHours = step / STEPS_PER_HOUR;
      const hour = Math.floor(timeInHours);
      const minute = Math.floor((timeInHours - hour) * 60);
      const timeString = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;

      // Compute effective outside temperature with diurnal variation.
      // Peak around 3PM and minimum around 3AM.
      const effectiveOutsideTemp =
        outsideTemp + (diurnalVariation / 2) * Math.sin((2 * Math.PI * (timeInHours - 9)) / 24);

      // Determine target temperature based on heating mode
      let targetTemp = desiredTemp;
      let heatingDisabled = false;
      if (mode === 2) {
        // For mode 2, disable heating between 10PM and 8AM and use a setback temperature.
        if (hour >= 22 || hour < 8) {
          heatingDisabled = true;
          targetTemp = 55;
        }
      }

      // Bang–bang controller with hysteresis to decide heater status.
      if (!heatingDisabled) {
        if (currentTemp < targetTemp - THERMOSTAT_HYSTERESIS / 2) {
          heaterOn = true;
        } else if (currentTemp > targetTemp + THERMOSTAT_HYSTERESIS / 2) {
          heaterOn = false;
        }
      } else {
        heaterOn = false;
      }

      // RK4 integration step
      const dt = SECONDS_PER_STEP / 3600; // time step in hours
      const heaterOutputValue = heaterOn ? HEATER_OUTPUT : 0;
      // Differential equation: dT/dt = (heaterOutputValue - (T - effectiveOutsideTemp)*heatLossCoefficient) / HOUSE_HEAT_CAPACITY
      const f = (T) =>
        (heaterOutputValue - (T - effectiveOutsideTemp) * heatLossCoefficient) / HOUSE_HEAT_CAPACITY;

      const k1 = f(currentTemp);
      const k2 = f(currentTemp + (k1 * dt) / 2);
      const k3 = f(currentTemp + (k2 * dt) / 2);
      const k4 = f(currentTemp + k3 * dt);

      const deltaT = (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      currentTemp += deltaT;

      // Track energy usage (BTU used per step)
      if (heaterOn) {
        totalEnergyUsed += HEATER_OUTPUT / STEPS_PER_HOUR;
      }

      data.push({
        time: timeString,
        hour,
        temperature: parseFloat(currentTemp.toFixed(2)),
        outsideTemp: parseFloat(effectiveOutsideTemp.toFixed(2)),
        heaterOn,
        energyUsed: totalEnergyUsed,
      });
    }

    setSimulationData(data);

    // Run a simulation for the opposite mode for comparison
    const otherMode = mode === 1 ? 2 : 1;
    let otherTemp = desiredTemp;
    let otherHeaterOn = false;
    let otherEnergyUsed = 0;

    for (let step = 0; step < TOTAL_STEPS; step++) {
      const timeInHours = step / STEPS_PER_HOUR;
      const hour = Math.floor(timeInHours);

      const effectiveOutsideTemp =
        outsideTemp + (diurnalVariation / 2) * Math.sin((2 * Math.PI * (timeInHours - 9)) / 24);

      let otherTargetTemp = desiredTemp;
      let otherHeatingDisabled = false;
      if (otherMode === 2) {
        if (hour >= 22 || hour < 8) {
          otherHeatingDisabled = true;
          otherTargetTemp = 55;
        }
      }

      if (!otherHeatingDisabled) {
        if (otherTemp < otherTargetTemp - THERMOSTAT_HYSTERESIS / 2) {
          otherHeaterOn = true;
        } else if (otherTemp > otherTargetTemp + THERMOSTAT_HYSTERESIS / 2) {
          otherHeaterOn = false;
        }
      } else {
        otherHeaterOn = false;
      }

      const dt = SECONDS_PER_STEP / 3600;
      const heaterOutputValue = otherHeaterOn ? HEATER_OUTPUT : 0;
      const fOther = (T) =>
        (heaterOutputValue - (T - effectiveOutsideTemp) * heatLossCoefficient) / HOUSE_HEAT_CAPACITY;

      const k1 = fOther(otherTemp);
      const k2 = fOther(otherTemp + (k1 * dt) / 2);
      const k3 = fOther(otherTemp + (k2 * dt) / 2);
      const k4 = fOther(otherTemp + k3 * dt);

      const deltaT = (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      otherTemp += deltaT;

      if (otherHeaterOn) {
        otherEnergyUsed += HEATER_OUTPUT / STEPS_PER_HOUR;
      }
    }

    // Calculate energy savings between the two modes.
    const mode1Energy = mode === 1 ? totalEnergyUsed : otherEnergyUsed;
    const mode2Energy = mode === 2 ? totalEnergyUsed : otherEnergyUsed;
    const savings = ((mode1Energy - mode2Energy) / mode1Energy * 100).toFixed(2);

    setSummary({
      mode1Energy: mode1Energy.toFixed(0),
      mode2Energy: mode2Energy.toFixed(0),
      savings,
    });
  };

  // Sample the simulation data for charting (e.g., every 30 minutes)
  const getChartData = () => {
    const sampleInterval = Math.floor(simulationData.length / (24 * 2)); // approx. every 30 minutes
    return simulationData.filter((_, index) => index % sampleInterval === 0);
  };

  return (
    <>
      {/* React Helmet for injecting OG/social sharing metadata */}
      <Helmet>
        <title>House Heating Simulation</title>
        <meta property="og:title" content="House Heating Simulation" />
        <meta
          property="og:description"
          content="Does it save money to turn down your heat at night? Run a simulation to find out!"
        />
        <meta
          property="og:image"
          content="https://example.com/path/to/placeholder-image.jpg"
        />
        <meta property="og:url" content="https://example.com/path/to/page" />
        <meta property="og:type" content="website" />
        <link
          rel="icon"
          href="https://example.com/path/to/placeholder-icon.png"
        />
        {/*
          Ideal image resolution for OG image: 1200 x 630 pixels.
          Ideal icon resolution for favicon: 32 x 32 pixels.
        */}
      </Helmet>

      <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-3">House Heating Simulation</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left column: Inputs */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outside Temp: {outsideTemp}°F
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
                Desired Inside Temp (°F): {desiredTemp}°F
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
              <span className="text-xs text-gray-500">
                (Higher values = better insulation)
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Temp Variation (°F): {diurnalVariation}°F
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={diurnalVariation}
                onChange={(e) => setDiurnalVariation(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">
                (Daily temperature swing amplitude)
              </span>
            </div>
          </div>

          {/* Right column: Mode selection and button */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heating Mode:
              </label>
              <div className="space-y-1">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="mode1"
                    name="mode"
                    checked={mode === 1}
                    onChange={() => setMode(1)}
                    className="mr-2"
                  />
                  <label htmlFor="mode1" className="text-sm">
                    Mode 1: 24-hour heating (constant)
                  </label>
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
                  <label htmlFor="mode2" className="text-sm">
                    Mode 2: Night setback (off 10PM–8AM)
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={runSimulation}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm"
              >
                Run Simulation
              </button>
            </div>

            {simulationData.length > 0 && (
              <div className="bg-gray-100 p-3 rounded mt-2 text-sm flex items-center">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Simulation Results:</h3>
                  <p>Mode 1 Energy: {summary.mode1Energy} BTU</p>
                  <p>Mode 2 Energy: {summary.mode2Energy} BTU</p>
                  <p className="font-bold">
                    {parseFloat(summary.savings) > 0
                      ? `Mode 2 saves ${summary.savings}%`
                      : `Mode 1 is more efficient by ${Math.abs(summary.savings)}%`}
                  </p>
                </div>
                <div className="w-40 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Mode 1', BTU: parseInt(summary.mode1Energy) },
                        { name: 'Mode 2', BTU: parseInt(summary.mode2Energy) },
                      ]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <Bar dataKey="BTU">
                        <Cell key="cell-0" fill="#8884d8" />
                        <Cell key="cell-1" fill="#82ca9d" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {simulationData.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-3">
              Temperature Over 24 Hours (°F)
            </h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    interval={7}
                    label={{
                      value: 'Time',
                      position: 'insideBottom',
                      offset: -5,
                    }}
                  />
                  <YAxis
                    label={{
                      angle: -90,
                      position: 'insideLeft',
                    }}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'temperature')
                        return [`${value}°F`, 'Inside Temp'];
                      if (name === 'outsideTemp')
                        return [`${value}°F`, 'Outside Temp'];
                      if (name === 'heaterOn')
                        return [value ? 'On' : 'Off', 'Heater'];
                      return [value, name];
                    }}
                    labelFormatter={(time) => `Time: ${time}`}
                  />
                  <Legend verticalAlign='top'/>
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
                  {/* <Line
                    type="step"
                    dataKey="heaterOn"
                    stroke="#ff7300"
                    strokeWidth={1.5}
                    dot={false}
                    name="Heater Status"
                  /> */}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <h2 className="text-xl font-semibold mt-4 mb-3">
              Cumulative Energy Usage (BTU)
            </h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    interval={7}
                    label={{
                      value: 'Time',
                      position: 'insideBottom',
                      offset: -5,
                    }}
                  />
                  <YAxis
                    label={{
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${parseInt(value).toLocaleString()} BTU`,
                      'Energy Used',
                    ]}
                    labelFormatter={(time) => `Time: ${time}`}
                  />
                  {/* <Legend verticalAlign='top' /> */}
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
    </>
  );
};

export default HouseHeatingSimulation;
