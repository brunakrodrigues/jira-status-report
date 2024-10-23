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
  ListItemText,
} from '@mui/material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const JiraReport = () => {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [sprintData, setSprintData] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [error, setError] = useState(null);
  const [loadingSprints, setLoadingSprints] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        setError('Error fetching projects');
      }
    };
    fetchProjects();
  }, []);

  const handleProjectChange = async (event) => {
    const selectedProject = event.target.value;
    setProject(selectedProject);
    setSprintData(null);
    setError(null);
    setLoadingSprints(true);

    try {
      const response = await axios.get(
        `http://localhost:3000/api/projects/${selectedProject}/current-work`
      );
      console.log(response)
      setSprintData(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar sprint atual:', error);
      setError('Error fetching sprint data');
    } finally {
      setLoadingSprints(false);
    }
  };

  const filterCancelledIssues = (issues) => {
    return issues.filter(issue => issue.fields.status.name.toUpperCase() !== 'CANCELADO');
  };

  const groupIssuesByAssignee = (issues) => {
    const filteredIssues = filterCancelledIssues(issues);

    const grouped = filteredIssues.reduce((acc, issue) => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const timeSpent = issue.fields.timetracking.timeSpentSeconds || 0;
      const status = issue.fields.status.name.toUpperCase();
      const isDone = status === 'DONE';
      const isInProgress = status === 'IN PROGRESS';

      if (!acc[assignee]) {
        acc[assignee] = { totalCards: 0, doneCards: 0, inProgressCards: 0, timeSpent: 0 };
      }

      acc[assignee].totalCards += 1;
      acc[assignee].timeSpent += timeSpent;
      if (isDone) acc[assignee].doneCards += 1;
      if (isInProgress) acc[assignee].inProgressCards += 1;

      return acc;
    }, {});

    return Object.entries(grouped).map(([assignee, data]) => ({
      assignee,
      totalCards: data.totalCards,
      doneCards: data.doneCards,
      inProgressCards: data.inProgressCards,
      timeSpent: Math.floor(data.timeSpent / 3600), // Converter para horas inteiras
    }));
  };

  const getStatusCounts = (issues) => {
    const filteredIssues = filterCancelledIssues(issues);

    const statusCounts = filteredIssues.reduce((acc, issue) => {
      const status = issue.fields.status.name;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  };

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

  return (
    <Container>
      <Drawer variant="permanent" open={true}>
        <List>
          <ListItem button>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Reports" />
          </ListItem>
        </List>
      </Drawer>

      <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
        <Typography variant="h4" align="center" gutterBottom>
          Sprint Overview Summary Report
        </Typography>

        {error && <Typography color="error">{error}</Typography>}

        <FormControl fullWidth>
          <InputLabel id="project-label">Select Project</InputLabel>
          <Select value={project} onChange={handleProjectChange}>
            {projects.map((proj) => (
              <MenuItem key={proj.id} value={proj.id}>
                {proj.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {sprintData && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{ xs: 'column', md: 'row' }} gap={3} marginTop={3}>
              <Box flex={1}>
                <Typography variant="h6">Sprint Details</Typography>
                <Typography variant="body1">Sprint ID: {sprintData.activeSprint.id}</Typography>
                <Typography variant="body1">Sprint Name: {sprintData.activeSprint.name}</Typography>
              </Box>

              <Box flex={1}>
                <Typography variant="h6">Board Details</Typography>
                <Typography variant="body1">Board ID: {sprintData.board.id}</Typography>
                <Typography variant="body1">Project Name: {sprintData.board.location.name}</Typography>
                <Typography variant="body1">
                  Total Cards: {filterCancelledIssues(sprintData.issues).length}
                </Typography>
              </Box>

              <Box flex={1} justifyContent="flex-end">
                <Button variant="contained" onClick={generatePDF} style={{ marginTop: '20px', background: '#573996' }}>
                  Export to PDF
                </Button>
              </Box>
            </Box>

            <FormControl fullWidth style={{ marginTop: '20px' }}>
              <InputLabel>Filter by Assignee</InputLabel>
              <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {groupIssuesByAssignee(sprintData.issues).map(({ assignee }) => (
                  <MenuItem key={assignee} value={assignee}>
                    {assignee}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box id='pdfContent'>
              <TableContainer component={Paper} style={{ marginTop: '20px' }}>
                <Table>
                  <TableHead style={{ background: '#573996' }}>
                    <TableRow>
                      <TableCell style={{ color: '#FFFF' }}>Assignee</TableCell>
                      <TableCell style={{ color: '#FFFF' }}>Total Cards</TableCell>
                      <TableCell style={{ color: '#FFFF' }}>In Progress Cards</TableCell>
                      <TableCell style={{ color: '#FFFF' }}>Done Cards</TableCell>
                      <TableCell style={{ color: '#FFFF' }}>Time Spent (hours)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody style={{ background: '#FFFF' }}>
                    {groupIssuesByAssignee(sprintData.issues)
                      .filter((row) => !assigneeFilter || row.assignee === assigneeFilter)
                      .map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.assignee}</TableCell>
                          <TableCell>{row.totalCards}</TableCell>
                          <TableCell>{row.inProgressCards}</TableCell>
                          <TableCell>{row.doneCards}</TableCell>
                          <TableCell>{row.timeSpent} h</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>


              <Typography variant="h6" style={{ marginTop: '20px' }}>
                Status Summary
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead style={{ background: '#573996' }}>
                    <TableRow>
                      <TableCell style={{ color: '#FFFF' }}>Status</TableCell>
                      <TableCell style={{ color: '#FFFF' }}>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getStatusCounts(sprintData.issues).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default JiraReport;
