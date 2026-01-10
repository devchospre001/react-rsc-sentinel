import React from 'react';

export default function StorageComponent() {
  const saveData = () => {
    localStorage.setItem('key', 'value');
    const data = window.localStorage.getItem('key');
    document.title = 'Updated';
  };

  return (
    <div>
      <button onClick={saveData}>Save Data</button>
    </div>
  );
}

