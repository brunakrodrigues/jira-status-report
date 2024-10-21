import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Drawer,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(ArcElement, Tooltip, Legend);

const JiraReport = () => {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');
  const [sprintData, setSprintData] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSprints, setLoadingSprints] = useState(false);

  // Buscar todos os projetos ao carregar a página
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsResponse = await axios.get('http://localhost:3000/api/projects');
        setProjects(projectsResponse.data);
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        setError('Error fetching projects');
      }
    };

    fetchProjects();
  }, []);

  // Buscar sprints de um projeto selecionado
  const handleProjectChange = async (event) => {
    const selectedProject = event.target.value;
    setProject(selectedProject);
    setSprint('');
    setSprintData(null);
    setError(null);
    setLoadingSprints(true);

    try {
      const currentWork = await axios.get(`http://localhost:3000/api/projects/${selectedProject}/current-work`);
      console.log(currentWork)
    } catch (error) {
      console.error('Erro ao buscar sprints:', error);
      setError('Error fetching sprints');
    } finally {
      setLoadingSprints(false);
    }
  };

  // Gerar o PDF da tela inteira
  const generatePDF = () => {
    const input = document.getElementById('pdfContent');
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('report.pdf');
    });
  };

  // Dados para o gráfico de progresso do Sprint
  const data = {
    labels: ['Completed', 'Blocked', 'In Progress'],
    datasets: [
      {
        label: 'Sprint Progress',
        data: [
          sprintData?.completed || 0,
          sprintData?.blocked || 0,
          sprintData?.inProgress || 0
        ],
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
        hoverBackgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
      },
    ],
  };

  return (
    <Container>
      {/* Menu Lateral */}
      <Drawer variant="permanent" open={open}>
        <List>
          <ListItem button>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Reports" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>
      </Drawer>

      {/* Conteúdo principal */}
      <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }} id="pdfContent">
        <Typography variant="h4" align="center" gutterBottom>
          Sprint Overview Summary Report
        </Typography>

        {error && <Typography color="error">{error}</Typography>}

        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
          {/* Seleção de Projeto */}
          <Box flex={1}>
            <FormControl fullWidth>
              <InputLabel id="project-label">Select Project</InputLabel>
              <Select
                labelId="project-label"
                value={project}
                onChange={handleProjectChange}
                label="Select Project"
              >
                {projects.map((proj) => (
                  <MenuItem key={proj.id} value={proj.id}>{proj.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Exibe o relatório apenas se houver dados do sprint */}
        {sprintData && (
          <>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} marginTop={3}>
              <Box flex={1}>
                <Typography variant="h6">Sprint Details</Typography>
                <Typography variant="body1">Sprint No: {sprintData.sprintNumber}</Typography>
                <Typography variant="body1">Release Start Date: {sprintData.releaseStartDate}</Typography>
                <Typography variant="body1">Release End Date: {sprintData.releaseEndDate}</Typography>
              </Box>

              <Box flex={1}>
                <Typography variant="h6">Sprint Progress</Typography>
                <Typography variant="body1">Completed: {sprintData.completed}%</Typography>
                <Typography variant="body1">Blocked: {sprintData.blocked}%</Typography>
                <Typography variant="body1">In Progress: {sprintData.inProgress}%</Typography>
              </Box>
            </Box>

            {/* Gráfico de Rosca */}
            <Box marginTop={3}>
              <Typography variant="h6">Sprint Progress Chart</Typography>
              <Doughnut data={data} />
            </Box>

            {/* Planejamento de Tarefas */}
            <Box marginTop={3}>
              <Typography variant="h6">Sprint Task Planning</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Assigned</TableCell>
                      <TableCell>Blocked</TableCell>
                      <TableCell>Fixed</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell>Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sprintData.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.assignee}</TableCell>
                        <TableCell>{task.assigned}</TableCell>
                        <TableCell>{task.blocked}</TableCell>
                        <TableCell>{task.fixed}</TableCell>
                        <TableCell>{task.submitted}</TableCell>
                        <TableCell>{task.hours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box marginTop={3}>
              <Button variant="contained" color="primary" onClick={generatePDF}>
                Export to PDF
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default JiraReport;
