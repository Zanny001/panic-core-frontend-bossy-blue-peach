import React from 'react';
import { vexo } from 'vexo-analytics';

// Initialize Vexo at the root level, outside of any component
if (__DEV__ === false) {
  vexo('34a3610d-f224-480e-a824-d29dc329b5a0');
}

export default function App() {
  // Your existing App component content here
  return null;
}
