import React from 'react';
import { Box, Typography, Button, Modal } from '@mui/material';
import { useApp } from '../contexts/AppContext'; // Importa useApp para el control del modal
import { useNavigate } from 'react-router-dom';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  textAlign: 'center',
  borderRadius: 2,
};

const SessionExpiredMessage: React.FC = () => {
  const { showSessionExpiredMessage, setShowSessionExpiredMessage, setIsLoggedIn, handleExpiredSessionRedirect } = useApp();
  const handleClose = () => {
     handleExpiredSessionRedirect(); 
  };

  return (
    <Modal
      open={showSessionExpiredMessage}
      // Proporciona una función vacía para onClose. Esto satisface el tipo de prop
      // y evita que el modal se cierre por defecto al hacer clic en el backdrop.
      onClose={() => {}} 
      aria-labelledby="session-expired-modal-title"
      aria-describedby="session-expired-modal-description"
      disableEscapeKeyDown={true} // Impide cerrar con la tecla Escape
      slotProps={{
        backdrop: {
          // Esto es crucial en MUI v5: detiene la propagación del evento de clic en el backdrop,
          // impidiendo que el modal se cierre al hacer clic fuera.
          onClick: (event) => event.stopPropagation(),
          sx: {
            backgroundColor: 'rgba(100, 100, 100, 0.95)', // Ajusta el color y la opacidad para un fondo más oscuro
          },
        },
      }}
    >
      <Box sx={style}>
        <Typography id="session-expired-modal-title" variant="h6" component="h2" gutterBottom>
          ¡Sesión Expirada!
        </Typography>
        <Typography id="session-expired-modal-description" sx={{ mt: 2, mb: 3 }}>
          Tu sesión ha expirado por inactividad o por seguridad. Por favor, inicia sesión de nuevo.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleClose}>
          Ir al Login
        </Button>
      </Box>
    </Modal>
  );
};

export default SessionExpiredMessage;
