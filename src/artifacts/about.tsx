import React from 'react';
import { Helmet } from 'react-helmet';

const About = () => {
  return (
    <>
      <Helmet>
        <title>About the House Heating Simulation</title>
        <meta name="description" content="Technical details about the house heating simulation model." />
      </Helmet>

      <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Technical Details: House Heating Simulation</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Model Overview</h2>
          <p className="mb-3">
            This simulation implements a first-principles thermodynamic model of residential heating, focusing on the energy balance 
            between a home's heating system, thermal mass, and heat loss to the environment. The model evaluates the efficiency 
            tradeoffs between constant temperature maintenance versus nighttime temperature setbacks.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Governing Equations</h2>
          <p className="mb-3">
            The core of the simulation is based on a first-order ordinary differential equation (ODE) that describes the 
            rate of temperature change within the house:
          </p>
          <div className="bg-gray-100 p-4 rounded-md mb-4 font-mono">
            dT/dt = (Q<sub>heater</sub> - (T<sub>inside</sub> - T<sub>outside</sub>) × k<sub>loss</sub>) / C<sub>house</sub>
          </div>
          <p className="mb-3">Where:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>dT/dt = Rate of change of indoor temperature (°F/hr)</li>
            <li>Q<sub>heater</sub> = Heat input from heating system (BTU/hr)</li>
            <li>T<sub>inside</sub> = Current indoor temperature (°F)</li>
            <li>T<sub>outside</sub> = Outdoor temperature (°F)</li>
            <li>k<sub>loss</sub> = Heat loss coefficient (BTU/hr·°F)</li>
            <li>C<sub>house</sub> = Thermal mass/heat capacity of the house (BTU/°F)</li>
          </ul>
          <p className="mb-3">
            The heat loss coefficient (k<sub>loss</sub>) is calculated as a function of the insulation efficiency parameter:
          </p>
          <div className="bg-gray-100 p-4 rounded-md mb-4 font-mono">
            k<sub>loss</sub> = 1000 / insulation
          </div>
          <p className="mb-3">
            Where the insulation parameter ranges from 1 (minimal insulation) to 10 (highly insulated), 
            resulting in k<sub>loss</sub> values from 1000 to 100 BTU/hr·°F.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Numerical Integration Method</h2>
          <p className="mb-3">
            The simulation employs a 4th-order Runge-Kutta (RK4) numerical integration method to solve the ODE. 
            This provides significantly higher accuracy than simpler methods such as Euler integration, particularly
            important for capturing thermal behavior during rapid temperature changes.
          </p>
          <p className="mb-3">The RK4 implementation calculates temperature changes as follows:</p>
          <div className="bg-gray-100 p-4 rounded-md mb-4 font-mono overflow-x-auto">
            <p>k1 = f(T)</p>
            <p>k2 = f(T + k1 × dt/2)</p>
            <p>k3 = f(T + k2 × dt/2)</p>
            <p>k4 = f(T + k3 × dt)</p>
            <p>ΔT = (dt/6) × (k1 + 2×k2 + 2×k3 + k4)</p>
          </div>
          <p className="mb-3">
            Where f(T) represents the differential equation described above, and dt is the time step (10 seconds 
            converted to hours for calculation purposes).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Simulation Parameters</h2>
          
          <h3 className="text-xl font-medium mb-2">Time Resolution</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Time step: 10 seconds</li>
            <li>Total simulation period: 24 hours</li>
            <li>Total calculation steps: 8,640 per simulation run</li>
          </ul>
          
          <h3 className="text-xl font-medium mb-2">Thermal Parameters</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>House heat capacity: 2,000-20,000 BTU/°F (adjustable)</li>
            <li>Heater output: 20,000-150,000 BTU/hr (adjustable)</li>
            <li>Insulation efficiency: 1-10 scale (translates to heat loss coefficients)</li>
            <li>Outside base temperature: -20°F to 60°F (adjustable)</li>
            <li>Desired indoor temperature: 50°F to 80°F (adjustable)</li>
            <li>Diurnal temperature variation: 0-30°F amplitude (adjustable)</li>
          </ul>

          <h3 className="text-xl font-medium mb-2">Control System</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Controller type: Bang-bang (on/off) with hysteresis</li>
            <li>Thermostat hysteresis: ±0.5°F around setpoint</li>
            <li>Mode 1: Constant temperature maintenance (24 hours)</li>
            <li>Mode 2: Night setback (heating disabled 10PM-8AM, setback to 55°F)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Outdoor Temperature Model</h2>
          <p className="mb-3">
            The simulation incorporates diurnal temperature variation using a sinusoidal function:
          </p>
          <div className="bg-gray-100 p-4 rounded-md mb-4 font-mono">
            T<sub>outside</sub> = T<sub>base</sub> + (A/2) × sin(2π × (t - 9)/24)
          </div>
          <p className="mb-3">Where:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>T<sub>base</sub> = Base outside temperature (°F)</li>
            <li>A = Diurnal temperature amplitude (°F)</li>
            <li>t = Time in hours (0-24)</li>
            <li>The phase shift (-9) aligns temperature minima to approximately 3AM and maxima to 3PM</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Model Assumptions and Limitations</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Single thermal zone:</strong> The house is modeled as a single lumped thermal mass with uniform 
              temperature distribution.
            </li>
            <li>
              <strong>Constant heat loss coefficient:</strong> The model assumes linear heat transfer proportional to 
              the temperature difference, not accounting for wind effects, humidity, or non-linear insulation performance.
            </li>
            <li>
              <strong>Instant heater response:</strong> The heating system is assumed to deliver its rated output immediately 
              upon activation, without startup or cooldown dynamics.
            </li>
            <li>
              <strong>No internal heat gains:</strong> Solar gain, occupant body heat, and appliance heat contributions 
              are not modeled.
            </li>
            <li>
              <strong>Idealized thermostat:</strong> Perfect temperature sensing without delays or measurement errors.
            </li>
            <li>
              <strong>No thermal stratification:</strong> The model doesn't account for temperature differences between 
              floor levels or rooms.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Energy Calculations</h2>
          <p className="mb-3">
            Energy consumption is calculated by integrating the heater's BTU output over its operation time:
          </p>
          <div className="bg-gray-100 p-4 rounded-md mb-4 font-mono">
            E<sub>total</sub> = Σ (Q<sub>heater</sub> × Δt) for all time steps where heater is on
          </div>
          <p className="mb-3">
            Energy efficiency comparison is performed by running identical simulations with both heating modes and 
            calculating the percentage difference.
          </p>
        </section>

      </div>
    </>
  );
};

export default About;