// Plugin Parameters (They need to be moved to a config screen)
var jiraHost = 'https://evolux.atlassian.net/';
var effortField = null;
var effortFieldScrum = 'customfield_10005';
var effortFieldSimple = 'customfield_10918';
var boardMenu = '#board-menu';
var chartContainer = '#chart-container';
var finishedStatus = ['FINISHED', 'CLOSED', 'DONE', 'REJECT'];
var boards;

// Main
var sprint = null;

$(document).ready(function () {
  listJiraBoards();
});

function listJiraBoards() {
  showMsg('Fetching Scrum Boards...');
  $.ajax({
    url: jiraHost + '/rest/agile/1.0/board?type=scrum,simple',
  }).then(function (data) {
    this.boards = data.values.sort(function (boardA, boardB) {
      if (
        boardA.location.name.toUpperCase() < boardB.location.name.toUpperCase()
      )
        return -1;
      if (
        boardA.location.name.toUpperCase() > boardB.location.name.toUpperCase()
      )
        return 1;
      return 0;
    });

    this.boards.forEach(function (board) {
      // TODO: Remover este workaround para exibição apenas do board de produto e produção quando refatorar rotina para cáculo de board agile
      // In order: 76 produto, 78 producao, 81 P&D, 71 UX
      if (
        board.id === 76 ||
        board.id === 78 ||
        board.id === 81
      ) {
        $(boardMenu).append(
          '<a href="#" id="' +
            board.id +
            '" class="list-group-item">' +
            board.location.name +
            ': ' +
            board.name +
            '</a>'
        );
      }
    });

    $(boardMenu + ' a').click(function () {
      $(boardMenu).hide();
      queryJiraInfo($(this)[0].id, function () {
        generateBurndownChart();
      });
    });
  });
}

function queryJiraInfo(boardId, fn) {
  showMsg('Fetching Sprint data on Jira...');
  $.ajax({
    url: jiraHost + '/rest/agile/1.0/board/' + boardId + '/sprint?state=active',
  }).then(function (data) {
    sprint = extractSprintData(data);

    showMsg('Getting issues data...');
    //const startTime = performance.now();
    $.ajax({
      url:
        jiraHost +
        '/rest/agile/1.0/board/' +
        boardId +
        '/sprint/' +
        sprint.id +
        '/issue?expand=changelog&maxResults=10000',
    }).then(function (data) {
      //const duration1 = performance.now()-startTime;
      //console.log(`Took ${duration1}`)
      // Get all issues except user stories
      //sprint.setIssues(data.issues.filter(function(issue){ return issue.fields.issuetype.description.indexOf('user story') == -1;}));
      sprint.setIssues(data.issues);
      //const duration2 = performance.now()-startTime;
      //console.log(`Took2 ${duration2}`)
      fn();
    });
  });
}

function generateBurndownChart() {

  showMsg('Generating burndown chart...');
  $(chartContainer).highcharts({
    title: {
      text: sprint.name,
      x: -10,
    },
    chart: {
      height: '70%',
    },
    exporting: {
      enabled: true,
    },
    scrollbar: {
      barBackgroundColor: 'gray',
      barBorderRadius: 7,
      barBorderWidth: 0,
      buttonBackgroundColor: 'gray',
      buttonBorderWidth: 0,
      buttonBorderRadius: 7,
      trackBackgroundColor: 'none',
      trackBorderWidth: 1,
      trackBorderRadius: 8,
      trackBorderColor: '#CCC',
    },
    colors: ['blue', 'red'],
    plotOptions: {
      line: {
        lineWidth: 3,
      },
      tooltip: {
        hideDelay: 200,
      },
    },
    subtitle: {
      text: 'Burndown Chart - Time - ' + sprint.nameTime,
      x: -10,
    },
    xAxis: {
      categories: sprint.dateRange(),
      labels: {
        rotation: -45,
      },
    },
    yAxis: {
      title: {
        text: 'Estimated Work',
      },
      type: 'linear',
    },
    tooltip: {
      valueSuffix: ' points',
      crosshairs: true,
      shared: true,
    },
    legend: {
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      borderWidth: 0,
    },
    series: [
      {
        name: 'Estimated',
        color: 'rgba(255,0,0,0.25)',
        lineWidth: 2,
        data: sprint.plannedEffort(),
      },
      {
        name: 'Remaining',
        color: 'rgba(0,120,200,0.75)',
        marker: {
          radius: 6,
        },
        data: sprint.remainingEffort(),
      },
    ],
  });
  $(chartContainer)
    .append('<a href="#">Boards List</a>')
    .click(function () {
      $(chartContainer).empty();
      $(boardMenu).show();
    });
}
