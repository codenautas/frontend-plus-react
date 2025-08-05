export function EmptyRowsRenderer() {
  return (
    <div style={{
        // Posicionamiento absoluto respecto a la pantalla
        position: 'fixed',
        top: '50%',              // Centrado verticalmente
        left: '50%',             // Centrado horizontalmente
        transform: 'translate(-50%, -50%)', // Ajuste para el 50% del tamaño del div
        
        // Estilos de visualización
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '16px 24px',
    
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
        <div style={{ textAlign: 'center' }}>
            No hay filas para mostrar
        </div>
    </div>
  );
}