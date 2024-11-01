import {
  Avatar,
  Box,
  Button,
  Container,
  Drawer,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Typography
} from '@mui/material';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import ErrorImage from './ErrorImage';
import GenericTable from './GenericTable';

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
        console.log(response)
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
      const accountId = issue.fields.assignee?.accountId || null;
      const avatarUrl = issue.fields.assignee?.avatarUrls['48x48'];

      const timeSpent = issue.fields.timetracking.timeSpentSeconds || 0;
      const status = issue.fields.status.name.toUpperCase();
      const isDone = status === 'DONE';
      const isInProgress = status === 'IN PROGRESS';

      if (!acc[assignee]) {
        acc[assignee] = {
          accountId,
          avatarUrl,
          totalCards: 0,
          doneCards: 0,
          inProgressCards: 0,
          timeSpent: 0
        };
      }

      acc[assignee].totalCards += 1;
      acc[assignee].timeSpent += timeSpent;
      if (isDone) acc[assignee].doneCards += 1;
      if (isInProgress) acc[assignee].inProgressCards += 1;

      return acc;
    }, {});

    return Object.entries(grouped).map(([assignee, data]) => ({
      assignee,
      ...data,
      timeSpent: Math.floor(data.timeSpent / 3600),
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

  const assigneeColumns = [
    {
      id: 'assignee',
      label: 'Assignee',
      render: (row) => (
        <Box display="flex" alignItems="center" gap={2}>
          {row.avatarUrl ? <Avatar src={row.avatarUrl} /> : <Avatar>{row.assignee[0]}</Avatar>}
          <Typography>{row.assignee}</Typography>
        </Box>
      ),
    },
    { id: 'totalCards', label: 'Total Cards' },
    { id: 'inProgressCards', label: 'In Progress Cards' },
    { id: 'doneCards', label: 'Done Cards' },
    { id: 'timeSpent', label: 'Time Spent (hours)' },
  ];

  const statusColumns = [
    { id: 'status', label: 'Status' },
    { id: 'count', label: 'Count' },
  ];

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

        <FormControl fullWidth>
          <InputLabel id="project-label">Select Project</InputLabel>
          <Select value={project} onChange={handleProjectChange}>
            {projects
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((proj) => (
                <MenuItem key={proj.id} value={proj.id}>
                  {proj.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {error && <ErrorImage />}

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

            {/* <FormControl fullWidth style={{ marginTop: '20px' }}>
              <InputLabel>Filter by Assignee</InputLabel>
              <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {groupIssuesByAssignee(sprintData.issues).map(({ assignee }) => (
                  <MenuItem key={assignee} value={assignee}>
                    {assignee}
                  </MenuItem>
                ))}
              </Select>
            </FormControl> */}

            <Box id='pdfContent'>
              <GenericTable
                columns={assigneeColumns}
                data={groupIssuesByAssignee(sprintData.issues)}
                title="Assignee Summary"
              />
              <GenericTable
                columns={statusColumns}
                data={getStatusCounts(sprintData.issues)}
                title="Status Summary"
              />
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default JiraReport;
