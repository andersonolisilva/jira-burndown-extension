var jiraHost = 'https://jiramult-e.atlassian.net';
var boardId = 28; // Board GCF
var effortField = 'customfield_10033';
var boardMenu = '#board-menu';
var container = '#container';
var sprint = null;

$(document).ready(function(){

	//listJiraBoards();

	
	queryJiraInfo(boardId, function(){
		showMsg('Generating burndown chart...');
		generateBurndownChart();
	});
	
	
});

function listJiraBoards()
{
	$.ajax({
		
		url: jiraHost + '/rest/agile/latest/board?maxResults=100'
		
	}).then(function(data){
		
		data.values.forEach(function(board)
		{
			console.log(board);
			$(boardMenu).append('<a href="#" class="list-group-item">' + board.id + ': ' + board.name + '</a>');
		});
		
	});
}

function queryJiraInfo(boardId, fn)
{
	showMsg('Fetching Sprint data on Jira...');
	$.ajax({
		
       url: jiraHost + '/rest/agile/1.0/board/'+ boardId +'/sprint?state=active'
	   
    }).then(function(data) {
		
      sprint = extractSprintData(data);
      
      showMsg('Getting issues data...');
      $.ajax({
        
        url: jiraHost + '/rest/agile/1.0/board/'+ boardId +'/sprint/'+ sprint.id +'/issue?expand=changelog'
        
      }).then(function(data){
        
        // Get all issues except user stories
        sprint.setIssues(data.issues.filter(function(issue){ return issue.fields.issuetype.description.indexOf('user story') == -1;}));
        
        fn();
      });

    });	
}

function generateBurndownChart()
{
   $(container).highcharts({
      title: {
         text: sprint.name,
         x: -10
      },
      exporting: {
        enabled: false
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
         trackBorderColor: '#CCC'
      },
      colors: ['blue', 'red'],
      plotOptions: {
         line: {
            lineWidth: 3
         },
         tooltip: {
            hideDelay: 200
         }
      },
      subtitle: {
         text: 'Burndown Chart',
         x: -10
      },
      xAxis: {
         categories: sprint.dateRange(),
		 labels: {
			 rotation: -45
		 }
      },
      yAxis: {
         title: {
            text: 'Remaining Work'
         },
         type: 'linear'
      },
      tooltip: {
         valueSuffix: ' points',
         crosshairs: true,
         shared: true
      },
      legend: {
         layout: 'horizontal',
         align: 'center',
         verticalAlign: 'bottom',
         borderWidth: 0
      },
      series: [{
          name: 'Expected',
         color: 'rgba(255,0,0,0.25)',
         lineWidth: 2,
         data: sprint.plannedEffort()
      }, {
         name: 'Remaining',
         color: 'rgba(0,120,200,0.75)',
         marker: {
            radius: 6
         },
         data: sprint.remainingEffort()
      }]
   });	
}