import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

interface SimulationData {
  time: string;
  hour: number;
  temperature: number;
  outsideTemp: number;
  heaterOn: boolean;
  energyUsed: number;
}

interface Summary {
  mode1Energy: string;
  mode2Energy: string;
  savings: string;
  mode1DutyCycle: string;
  mode2DutyCycle: string;
}

const HouseHeatingSimulation = () => {
  // Simulation parameters
  const [outsideTemp, setOutsideTemp] = useState(30); // Base outside temperature (°F)
  const [desiredTemp, setDesiredTemp] = useState(68); // Desired inside temperature (°F)
  const [insulation, setInsulation] = useState(5); // Insulation efficiency (1-10)
  const [houseHeatCapacity, setHouseHeatCapacity] = useState(4000); // House heat capacity (BTU/°F)
  const [heaterOutput, setHeaterOutput] = useState(60000); // Heater output (BTU/hr)
  const [diurnalVariation, setDiurnalVariation] = useState(15); // Diurnal variation slider (0-30°F)
  const [thermostatHysteresis, setThermostatHysteresis] = useState(2); // Thermostat hysteresis (°F)
  const [simulationData, setSimulationData] = useState<{mode1: SimulationData[], mode2: SimulationData[]}>({
    mode1: [],
    mode2: []
  });
  const [summary, setSummary] = useState<Summary>({
    mode1Energy: '0',
    mode2Energy: '0',
    savings: '0',
    mode1DutyCycle: '0',
    mode2DutyCycle: '0',
  });
  const [showAdvanced, setShowAdvanced] = useState(false); // State for advanced section toggle
  const [useCelsius, setUseCelsius] = useState(false); // Temperature unit toggle

  // Constants
  const SECONDS_PER_STEP = 10; // 10 seconds per simulation step
  const STEPS_PER_HOUR = 3600 / SECONDS_PER_STEP; // steps per hour
  const HOURS_SIMULATED = 24;
  const TOTAL_STEPS = HOURS_SIMULATED * STEPS_PER_HOUR;

  // Temperature conversion functions
  const fahrenheitToCelsius = (fahrenheit: number): number => {
    return (fahrenheit - 32) * 5 / 9;
  };

  // Format temperature for display based on selected unit
  const formatTemp = (tempF: number): string => {
    if (useCelsius) {
      return `${fahrenheitToCelsius(tempF).toFixed(1)}°C`;
    }
    return `${tempF}°F`;
  };

  // Get temperature value for display (numeric only)
  const displayTemp = (tempF: number): number => {
    if (useCelsius) {
      return parseFloat(fahrenheitToCelsius(tempF).toFixed(1));
    }
    return tempF;
  };
  
  // Convert BTU to kW
  const btuToKw = (btu: number): number => {
    return btu * 0.000293071; // 1 BTU/hr = 0.000293071 kW
  };
  
  // Format energy based on selected temperature unit
  const formatEnergy = (btu: number, isRate: boolean = false): string => {
    if (useCelsius) {
      const kw = btuToKw(btu);
      if (isRate) {
        return `${kw.toFixed(2)} kW`;
      } else {
        return `${kw.toFixed(2)} kWh`;
      }
    }
    return `${btu.toLocaleString()} BTU`;
  };

  const runSimulation = () => {
    // Display loading state if needed in the future
    
    // Determine heat loss coefficient (BTU/hr per °F difference)
    const heatLossCoefficient = 1000 / insulation;
    
    // Run simulation for Mode 1 (24-hour heating)
    let mode1Temp = desiredTemp;
    let mode1HeaterOn = false;
    let mode1EnergyUsed = 0;
    let mode1HeaterOnCount = 0;
    const mode1Data: SimulationData[] = [];
    
    // Run simulation for Mode 2 (Night setback)
    let mode2Temp = desiredTemp;
    let mode2HeaterOn = false;
    let mode2EnergyUsed = 0;
    let mode2HeaterOnCount = 0;
    const mode2Data: SimulationData[] = [];

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

      // Mode 1: 24-hour heating (always on)
      // No setback, always use desired temperature
      const mode1TargetTemp = desiredTemp;
      
      // Bang-bang controller with hysteresis for Mode 1
      if (mode1Temp < mode1TargetTemp - thermostatHysteresis / 2) {
        mode1HeaterOn = true;
      } else if (mode1Temp > mode1TargetTemp + thermostatHysteresis / 2) {
        mode1HeaterOn = false;
      }

      // Mode 2: Night setback
      // Disable heating between 10PM and 8AM
      let mode2TargetTemp = desiredTemp;
      let mode2HeatingDisabled = false;
      if (hour >= 22 || hour < 8) {
        mode2HeatingDisabled = true;
        // No setback temperature needed since heating is completely disabled
      }
      
      // Bang-bang controller with hysteresis for Mode 2
      if (!mode2HeatingDisabled) {
        if (mode2Temp < mode2TargetTemp - thermostatHysteresis / 2) {
          mode2HeaterOn = true;
        } else if (mode2Temp > mode2TargetTemp + thermostatHysteresis / 2) {
          mode2HeaterOn = false;
        }
      } else {
        mode2HeaterOn = false;
      }

      // RK4 integration for Mode 1
      const dt = SECONDS_PER_STEP / 3600; // time step in hours
      const mode1HeaterOutputValue = mode1HeaterOn ? heaterOutput : 0;
      
      const f1 = (T: number) =>
        (mode1HeaterOutputValue - (T - effectiveOutsideTemp) * heatLossCoefficient) / houseHeatCapacity;

      const k1_1 = f1(mode1Temp);
      const k2_1 = f1(mode1Temp + (k1_1 * dt) / 2);
      const k3_1 = f1(mode1Temp + (k2_1 * dt) / 2);
      const k4_1 = f1(mode1Temp + k3_1 * dt);

      const deltaT1 = (dt / 6) * (k1_1 + 2 * k2_1 + 2 * k3_1 + k4_1);
      mode1Temp += deltaT1;

      // RK4 integration for Mode 2
      const mode2HeaterOutputValue = mode2HeaterOn ? heaterOutput : 0;
      
      const f2 = (T: number) =>
        (mode2HeaterOutputValue - (T - effectiveOutsideTemp) * heatLossCoefficient) / houseHeatCapacity;

      const k1_2 = f2(mode2Temp);
      const k2_2 = f2(mode2Temp + (k1_2 * dt) / 2);
      const k3_2 = f2(mode2Temp + (k2_2 * dt) / 2);
      const k4_2 = f2(mode2Temp + k3_2 * dt);

      const deltaT2 = (dt / 6) * (k1_2 + 2 * k2_2 + 2 * k3_2 + k4_2);
      mode2Temp += deltaT2;

      // Track energy usage and duty cycle (BTU used per step)
      if (mode1HeaterOn) {
        mode1EnergyUsed += heaterOutput / STEPS_PER_HOUR;
        mode1HeaterOnCount++;
      }
      
      if (mode2HeaterOn) {
        mode2EnergyUsed += heaterOutput / STEPS_PER_HOUR;
        mode2HeaterOnCount++;
      }

      // Store Mode 1 data
      mode1Data.push({
        time: timeString,
        hour,
        temperature: parseFloat(mode1Temp.toFixed(2)),
        outsideTemp: parseFloat(effectiveOutsideTemp.toFixed(2)),
        heaterOn: mode1HeaterOn,
        energyUsed: mode1EnergyUsed,
      });
      
      // Store Mode 2 data
      mode2Data.push({
        time: timeString,
        hour,
        temperature: parseFloat(mode2Temp.toFixed(2)),
        outsideTemp: parseFloat(effectiveOutsideTemp.toFixed(2)),
        heaterOn: mode2HeaterOn,
        energyUsed: mode2EnergyUsed,
      });
    }

    // Set simulation data for both modes
    setSimulationData({
      mode1: mode1Data,
      mode2: mode2Data
    });

    // Calculate energy savings between the two modes
    const savings = ((mode1EnergyUsed - mode2EnergyUsed) / mode1EnergyUsed * 100).toFixed(2);

    // Compute the heater duty cycle for each mode
    const mode1DutyCycle = (mode1HeaterOnCount / TOTAL_STEPS) * 100;
    const mode2DutyCycle = (mode2HeaterOnCount / TOTAL_STEPS) * 100;

    setSummary({
      mode1Energy: mode1EnergyUsed.toFixed(0),
      mode2Energy: mode2EnergyUsed.toFixed(0),
      savings,
      mode1DutyCycle: mode1DutyCycle.toFixed(2),
      mode2DutyCycle: mode2DutyCycle.toFixed(2),
    });
  };

  // Sample the simulation data for temperature charting
  const getTemperatureChartData = () => {
    if (simulationData.mode1.length === 0 || simulationData.mode2.length === 0) return [];
    
    const sampleInterval = Math.floor(simulationData.mode1.length / (24 * 2)); // approx. every 30 minutes
    
    // Create combined dataset with both modes' temperatures and outside temperature
    return simulationData.mode1
      .filter((_, index) => index % sampleInterval === 0)
      .map((dataPoint, i) => {
        const mode2Point = simulationData.mode2[Math.min(i * sampleInterval, simulationData.mode2.length - 1)];
        
        if (useCelsius) {
          return {
            time: dataPoint.time,
            hour: dataPoint.hour,
            mode1Temp: displayTemp(dataPoint.temperature),
            mode2Temp: displayTemp(mode2Point.temperature),
            outsideTemp: displayTemp(dataPoint.outsideTemp),
          };
        }
        
        return {
          time: dataPoint.time,
          hour: dataPoint.hour,
          mode1Temp: dataPoint.temperature,
          mode2Temp: mode2Point.temperature,
          outsideTemp: dataPoint.outsideTemp,
        };
      });
  };
  
  // Sample the simulation data for energy usage charting
  const getEnergyChartData = () => {
    if (simulationData.mode1.length === 0 || simulationData.mode2.length === 0) return [];
    
    const sampleInterval = Math.floor(simulationData.mode1.length / (24 * 2)); // approx. every 30 minutes
    
    // Create combined dataset with both modes' energy usage
    return simulationData.mode1
      .filter((_, index) => index % sampleInterval === 0)
      .map((dataPoint, i) => {
        const mode2Point = simulationData.mode2[Math.min(i * sampleInterval, simulationData.mode2.length - 1)];
        
        return {
          time: dataPoint.time,
          hour: dataPoint.hour,
          mode1Energy: dataPoint.energyUsed,
          mode2Energy: mode2Point.energyUsed,
        };
      });
  };

  // Toggle advanced settings visibility
  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  // Toggle temperature unit
  const toggleTemperatureUnit = () => {
    setUseCelsius(!useCelsius);
  };

  // Run simulation whenever a parameter changes
  useEffect(() => {
    runSimulation();
  }, [outsideTemp, desiredTemp, insulation, houseHeatCapacity, heaterOutput, diurnalVariation, thermostatHysteresis]);

  // Temperature range limits in F
  const outsideTempMin = -20;
  const outsideTempMax = 60;
  const desiredTempMin = 50;
  const desiredTempMax = 80;

  return (
    <>
      {/* React Helmet for injecting OG/social sharing metadata */}
      <Helmet>
        <title>House Heating Simulation</title>
      </Helmet>

      <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-3">House Heating Simulation</h1>

        <div className="flex justify-between items-center mb-4">
          <Link to="/about" className="text-blue-600 hover:underline">
            Learn more about this simulation.
          </Link>
          
          {/* Temperature unit toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">°F</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={useCelsius}
                onChange={toggleTemperatureUnit}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium">°C</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left column: Inputs */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outside Temp: {formatTemp(outsideTemp)}
              </label>
              <input
                type="range"
                min={outsideTempMin}
                max={outsideTempMax}
                value={outsideTemp}
                onChange={(e) => setOutsideTemp(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTemp(outsideTempMin)}</span>
                <span>{formatTemp(outsideTempMax)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Inside Temp: {formatTemp(desiredTemp)}
              </label>
              <input
                type="range"
                min={desiredTempMin}
                max={desiredTempMax}
                value={desiredTemp}
                onChange={(e) => setDesiredTemp(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTemp(desiredTempMin)}</span>
                <span>{formatTemp(desiredTempMax)}</span>
              </div>
            </div>

            {/* Advanced Toggle Button */}
            <div className="pt-2">
              <button
                onClick={toggleAdvanced}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <span>{showAdvanced ? '▼' : '►'} Advanced Settings</span>
              </button>
            </div>

            {/* Advanced Settings Section */}
            {showAdvanced && (
              <div className="pt-2 pl-2 border-l-2 border-blue-200">
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
                    Heater output {useCelsius ? `(${btuToKw(heaterOutput).toFixed(2)} kW)` : `(${heaterOutput.toLocaleString()} BTU/hr)`}
                  </label>
                  <input
                    type="range"
                    min="20000"
                    max="150000"
                    step="5000"
                    value={heaterOutput}
                    onChange={(e) => setHeaterOutput(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    House Heat Capacity {useCelsius ? `(${(houseHeatCapacity * 0.5).toFixed(0)} kJ/°C)` : `(${houseHeatCapacity.toLocaleString()} BTU/°F)`}
                  </label>
                  <input
                    type="range"
                    min="2000"
                    max="20000"
                    step="1000"
                    value={houseHeatCapacity}
                    onChange={(e) => setHouseHeatCapacity(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">
                    (Higher values ~= bigger house)
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Temp Variation: {formatTemp(diurnalVariation)}
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

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thermostat Hysteresis: {formatTemp(thermostatHysteresis)}
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="10"
                    step="0.25"
                    value={thermostatHysteresis}
                    onChange={(e) => setThermostatHysteresis(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">
                    (Temperature band where heater stays in current state)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right column: Mode descriptions and automatic update info */}
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Simulating both heating modes:
              </div>
              <div className="space-y-1 pl-2 border-l-2 border-blue-200">
                <div className="text-sm mb-1">
                  <span className="font-semibold text-indigo-600">Mode 1:</span> 24-hour heating at {formatTemp(desiredTemp)} (constant)
                </div>
                <div className="text-sm mb-1">
                  <span className="font-semibold text-green-600">Mode 2:</span> Night setback (heating off 10PM–8AM)
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-center text-sm text-gray-600 italic mb-2">
                Simulation updates automatically as you change parameters
              </div>
            </div>

            {simulationData.mode1.length > 0 && (
              <div className="bg-gray-100 p-3 rounded mt-2 text-sm flex items-center">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Simulation Results:</h3>
                  <p><span className="font-semibold text-indigo-600">Mode 1</span> Energy: {formatEnergy(parseInt(summary.mode1Energy))}</p>
                  <p><span className="font-semibold text-green-600">Mode 2</span> Energy: {formatEnergy(parseInt(summary.mode2Energy))}</p>
                  <p><span className="font-semibold text-indigo-600">Mode 1</span> Heater Duty Cycle: {summary.mode1DutyCycle}%</p>
                  <p><span className="font-semibold text-green-600">Mode 2</span> Heater Duty Cycle: {summary.mode2DutyCycle}%</p>
                  <p className="font-bold mt-2">
                    {parseFloat(summary.savings) > 0
                      ? `Night setback saves ${summary.savings}% energy`
                      : `Constant heating is more efficient by ${Math.abs(parseFloat(summary.savings))}%`}
                  </p>
                </div>
                <div className="w-40 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Mode 1', Energy: parseInt(summary.mode1Energy) },
                        { name: 'Mode 2', Energy: parseInt(summary.mode2Energy) },
                      ]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <Bar dataKey="Energy">
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

        {simulationData.mode1.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-3">
              Temperature Over 24 Hours {useCelsius ? '(°C)' : '(°F)'}
            </h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getTemperatureChartData()}>
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
                      if (name === 'mode1Temp')
                        return [`${value}${useCelsius ? '°C' : '°F'}`, 'Mode 1 Temp'];
                      if (name === 'mode2Temp')
                        return [`${value}${useCelsius ? '°C' : '°F'}`, 'Mode 2 Temp'];
                      if (name === 'outsideTemp')
                        return [`${value}${useCelsius ? '°C' : '°F'}`, 'Outside Temp'];
                      return [value, name];
                    }}
                    labelFormatter={(time) => `Time: ${time}`}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="mode1Temp"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    name="Mode 1 (24hr)"
                  />
                  <Line
                    type="monotone"
                    dataKey="mode2Temp"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={false}
                    name="Mode 2 (Night Setback)"
                  />
                  <Line
                    type="monotone"
                    dataKey="outsideTemp"
                    stroke="#aaaaaa"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Outside Temp"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <h2 className="text-xl font-semibold mt-4 mb-3">
              Cumulative Energy Usage {useCelsius ? '(kWh)' : '(BTU)'}
            </h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getEnergyChartData()}>
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
                    domain={useCelsius ? ['dataMin', 'dataMax'] : undefined}
                    tickFormatter={(value) => useCelsius ? btuToKw(value).toFixed(1) : value.toLocaleString()}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'mode1Energy') {
                        if (useCelsius) {
                          return [`${btuToKw(parseInt(value.toString())).toFixed(2)} kWh`, 'Mode 1 Energy'];
                        }
                        return [`${parseInt(value.toString()).toLocaleString()} BTU`, 'Mode 1 Energy'];
                      }
                      if (name === 'mode2Energy') {
                        if (useCelsius) {
                          return [`${btuToKw(parseInt(value.toString())).toFixed(2)} kWh`, 'Mode 2 Energy'];
                        }
                        return [`${parseInt(value.toString()).toLocaleString()} BTU`, 'Mode 2 Energy'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(time) => `Time: ${time}`}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="mode1Energy"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    name="Mode 1 (24hr)"
                  />
                  <Line
                    type="monotone"
                    dataKey="mode2Energy"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={false}
                    name="Mode 2 (Night Setback)"
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