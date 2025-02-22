import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <>
      <Helmet>
        <title>About House Heating Simulation</title>
      </Helmet>
      <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">About the House Heating Simulation</h1>
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:underline">
            &larr; Back to Simulation
          </Link>
        </div>

        {/* Section for non-engineering normies */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">For Everyone</h2>
          <p className="mb-2">
            This simulation lets you explore how a house’s heating system reacts to changes in weather, insulation, and heating settings. By adjusting the sliders, you can set the outside temperature, the temperature you want inside, the quality of insulation, and how much the temperature varies during the day.
          </p>
          <p className="mb-2">
            Once you hit “Run Simulation,” the model calculates the indoor temperature over a 24-hour period, shows when the heater is on or off, and tracks the total energy used. It even compares two heating strategies – a constant, 24-hour heating mode versus a “night setback” mode that lowers the temperature during off-peak hours – to highlight potential energy savings.
          </p>
          <p>
            In short, it’s a fun way to see how your choices affect the comfort and energy efficiency of a home!
          </p>
        </section>

        {/* Section for hardcore nerds */}
        <section>
          <h2 className="text-xl font-semibold mb-2">For the Engineering Enthusiasts</h2>
          <p className="mb-2">
            Under the hood, the simulation uses a simplified thermal model of a house. The change in indoor temperature is modeled by the differential equation:
          </p>
          <p className="mb-2 pl-4 italic">
            dT/dt = (Heater Output - (T - Tₒᵤₜ) × Heat Loss Coefficient) / Heat Capacity
          </p>
          <p className="mb-2">
            We use the 4th-order Runge-Kutta (RK4) integration method to solve this equation numerically. Each simulation step represents 10 seconds (converted to hours), ensuring both stability and accuracy over the 24-hour period.
          </p>
          <p className="mb-2">
            Key parameters include:
          </p>
          <ul className="list-disc pl-6 mb-2">
            <li>
              <strong>Heater Output:</strong> 60,000 BTU/hr when the heater is active.
            </li>
            <li>
              <strong>House Heat Capacity:</strong> 4,000 BTU/°F, which controls how fast the indoor temperature changes.
            </li>
            <li>
              <strong>Heat Loss Coefficient:</strong> Computed as 1000 divided by the insulation value, this represents the rate at which heat is lost to the environment.
            </li>
            <li>
              <strong>Thermostat Hysteresis:</strong> ±0.5°F to avoid rapid on/off cycling.
            </li>
            <li>
              <strong>Diurnal Variation:</strong> A sinusoidal function adds realistic daily fluctuations to the outside temperature (peaking around 3 PM and dipping around 3 AM).
            </li>
            <li>
              <strong>Heating Modes:</strong> Mode 1 provides constant, 24-hour heating, while Mode 2 (night setback) lowers the target temperature to 55°F between 10 PM and 8 AM.
            </li>
          </ul>
          <p>
            The simulation not only updates the temperature and energy use at every time step but also compares the total energy consumption between the two modes, providing an estimate of the percentage savings.
          </p>
        </section>
      </div>
    </>
  );
};

export default About;
