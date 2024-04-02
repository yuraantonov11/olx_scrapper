import { ChangeEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import { FormControlLabel, FormGroup, TextField } from '@mui/material';

function LinearProgressWithLabel({
  value,
  valueBuffer,
}: {
  value: string;
  valueBuffer: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}{' '}
        <LinearProgress
          variant="buffer"
          value={Number(value)}
          valueBuffer={Number(valueBuffer)}
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">
          {`${value}%`} {/* Use the formatted value directly */}
        </Typography>
      </Box>
    </Box>
  );
}

function ScriptRunner() {
  const [progress, setProgress] = useState('0');
  const [isRunning, setIsRunning] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isShowingBrowser, setShowingBrowser] = useState(false);
  const [isUseCreds, setUseCreds] = useState(false);

  useEffect(() => {
    window.electron?.onProgress((data) => {
      if (!data) return;
      const formattedProgress = data.progress.toFixed(2); // Format to 2 decimal places
      setProgress(formattedProgress);
      setIsRunning(data.isRunning);
    });
  }, []);
  useEffect(() => {
    window.electron?.onEnd(({ fileName }) => {
      setProgress('100');
      setIsRunning(false);
      // eslint-disable-next-line no-alert
      alert(`Файл Збережено: ${fileName}`);
      setProgress('0');
    });
  }, []);

  const handleStart = async () => {
    try {
      const userCreds = isUseCreds
        ? {
            email,
            password,
          }
        : {};
      const config = { isShowingBrowser }; // Adjust configuration as needed
      window.electron?.startScrapper(userCreds, config);
      setIsRunning(true);
      // setProgress(response.progress);
    } catch (error: any) {
      setIsRunning(false);

      console.error('Error starting scraper:', error);
      // Handle errors appropriately, e.g., display an error message or notification
      // eslint-disable-next-line no-alert
      alert(`Failed to start scraper: ${error.message}`); // Replace with appropriate UI feedback
    }
  };

  const handleStop = async () => {
    if (isRunning) {
      try {
        window.electron?.stopScrapper();

        setIsRunning(false);
      } catch (error) {
        console.error('Error stopping script:', error);
        // Handle errors gracefully, e.g., display an error message
      }
    }
  };

  const handleShowingBrowser = (e: ChangeEvent<HTMLInputElement>) => {
    setShowingBrowser(e.target.checked);
  };
  const handleUseCreds = (e: ChangeEvent<HTMLInputElement>) => {
    setUseCreds(e.target.checked);
  };

  function handleEmail(e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    setEmail(e.target.value);
  }

  function handlePassword(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    setPassword(e.target.value);
  }

  return (
    <div>
      {!isRunning || (
        <LinearProgressWithLabel value={progress} valueBuffer={progress} />
      )}{' '}
      <Box
        component="form"
        sx={{
          '& .MuiTextField-root': { m: 1, width: '25ch' },
        }}
        noValidate
        autoComplete="off"
        minHeight="50hv"
      >
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                disabled={isRunning}
                checked={isShowingBrowser}
                onChange={handleShowingBrowser}
              />
            }
            label="Показувати вкно браузера"
          />
        </FormGroup>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                disabled={isRunning}
                checked={isUseCreds}
                onChange={handleUseCreds}
              />
            }
            label="Увійти для отримання номерів телефонів (всерівно потрібен ввід капчі)"
          />
        </FormGroup>{' '}
        {isUseCreds && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="20vh"
          >
            <TextField
              id="outlined-email-input"
              label="Пошта"
              type="email"
              value={email}
              autoComplete="current-email"
              onChange={(e) => handleEmail(e)}
            />
            <TextField
              id="outlined-password-input"
              label="Пароль"
              value={password}
              type="password"
              autoComplete="current-password"
              onChange={(e) => handlePassword(e)}
            />
          </Box>
        )}
        <div>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="10vh"
          >
            <Button
              variant="contained"
              disabled={isRunning}
              onClick={handleStart}
              color="primary"
              size="large"
            >
              {isRunning ? 'Запуск...' : 'Запустити'}
            </Button>
            <Button
              variant="contained"
              disabled={!isRunning}
              onClick={handleStop}
              size="large"
            >
              Зупинити
            </Button>
          </Box>
        </div>
      </Box>
    </div>
  );
}

export default ScriptRunner;
