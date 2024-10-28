import React from 'react';
import { Box, Typography } from '@mui/material';
import errorGif from '../assets/images/error.gif'; // Importando o GIF corretamente

const ErrorImage = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      marginTop="50px"
    >
      <Typography variant="h6" color="textSecondary" marginTop={2}>
        Esse Projeto não tem Sprint Ativa
      </Typography>
      <Box
        component="img"
        src={errorGif} // Usando a imagem importada
        alt="Error"
        sx={{ maxWidth: 400, width: '100%', margin: '0 auto' }}
      />
    </Box>
  );
};

export default ErrorImage;
