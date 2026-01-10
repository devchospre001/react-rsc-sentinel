import React from 'react';

async function fetchData() {
  const res = await fetch('https://api.example.com/data');
  return res.json();
}

export default async function ServerComponent() {
  const data = await fetchData();
  
  return (
    <div>
      <h1>Server Component</h1>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  );
}

