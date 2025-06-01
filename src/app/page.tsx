export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '1rem',
          color: '#1976d2' 
        }}>
          Healthcare Lead Management
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          color: '#666'
        }}>
          Enterprise Platform for Healthcare Leads
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href="/login" 
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            Login
          </a>
          <a 
            href="/admin/dashboard" 
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#fff',
              color: '#1976d2',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              border: '2px solid #1976d2',
              display: 'inline-block'
            }}
          >
            Admin Demo
          </a>
        </div>
        <div style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#999' }}>
          <p>Built with Next.js, TypeScript, and AWS Amplify</p>
          <p>© 2024 Healthcare Lead Management</p>
        </div>
      </div>
    </div>
  );
} 