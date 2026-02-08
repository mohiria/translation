import React from 'react'

export const Options = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Settings</h1>
      <section>
        <h2>API Keys</h2>
        <div>
          <label>OpenAI API Key: </label>
          <input type="password" placeholder="sk-..." />
        </div>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>General</h2>
        <div>
          <label>
            <input type="checkbox" /> Show IPA Pronunciation
          </label>
        </div>
      </section>
    </div>
  )
}