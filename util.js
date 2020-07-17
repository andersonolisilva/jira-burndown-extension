function buildDate(strDate)
{
	var date = null;

	if(typeof strDate == 'string')
	{
		var regEx = /^\d{4}-\d{2}-\d{2}$/;
		if(strDate.match(regEx))
			date = new Date(strDate.replace('-', '//'));
		else
			date = new Date(strDate);
	}
	else
	{
		date = new Date(strDate);
	}

	date.setHours(0, 0, 0, 0);
	return date;
}

Date.prototype.addDays = function(days) 
{
    var date = buildDate(this.valueOf());
	date.setDate(date.getDate() + days);
    return date;
};

Date.prototype.formatDate = function() {
	var dd = this.getDate();
	if(dd < 10) dd = '0' + dd;
	var mm = this.getMonth() + 1;
	if(mm < 10) mm = '0' + mm;
	var yyyy = this.getFullYear();
	return String( mm + "\/" + dd + "\/" + yyyy);
};

function Sprint(id, name, startDate, endDate)
{
	this.id = id;
	this.name = name;
	this.startDate = startDate;
	this.endDate = endDate;
	this.nonWorkingDays;
	
	this.issues = new Array();
	
	this.setIssues = function(issues)
	{
		this.issues = issues;

		var finishedIssues = this.issues.filter(function(issue){return isIssueFinished(issue);});
		
		finishedIssues.forEach(function(issue){
			for(var i = issue.changelog.histories.length-1; i >= 0; i--)
			{
				var history = issue.changelog.histories[i];
				if(isIssueFinished(null,history))
					issue.finishedOn = history.created;
			}
		});
	};
	
	this.dateRange = function()
	{
		var dateArray = new Array();
		var currentDate = this.startDate;
		currentDate.setHours(0, 0, 0, 0);

		while (currentDate <= this.endDate) 
		{
			if(isAnWorkingDay(currentDate, this.nonWorkingDays))
				dateArray.push(currentDate.formatDate());

			currentDate = currentDate.addDays(1);
		}

		return dateArray;
	};
	
	this.effort = function()
	{
		var points = 0;	
		this.issues.forEach(function(issue){
			let pointActual = issue.fields[effortField];
			if (typeof(pointActual) != 'undefined' && pointActual != null){
				points += issue.fields[effortField];
			}
		});
		return points;
	};
	
	this.plannedEffort = function()
	{
		var planned = new Array();
		var effort = this.effort();
		var diff = effort/(this.dateRange().length-1);
		var lastValue = -1;
		for(var i = effort; i > 0; i = i - diff)
		{
			lastValue = Math.round(i);
			planned.push(lastValue);
		}
		if(lastValue > 0)
			planned.push(0);
		return planned;		
	};
	
	this.remainingEffort = function()
	{	
		let realizedEffort = new Array();
		let totalPointPerSubtask = 0;
		let totalSubtaskDone = 0;
		let ticketKey = "";
		let issuesAll = this.issues;
		let issuesTaskSprint = this.issues.filter(function(issues){return issues.fields.issuetype.subtask===false});
		
		let finishedIssues = new Array();
		let issuesDateAndPoint = new Array();
		let subtaskPoint = 0;

		issuesTaskSprint.forEach(function(data){
			  totalSubtaskDone = 0;
			  ticketKey = data.key;
			  totalPointPerSubtask = data.fields[effortField] / data.fields['subtasks'].length;
			  data.fields.subtasks.forEach(function(data){
				subtaskKey = data.key;
				subtaskFinishedOn = getSubTaskFinishedOn(issuesAll,subtaskKey);
				if( typeof subtaskFinishedOn !== "undefined"){
					totalSubtaskDone = totalSubtaskDone + 1;
					subtaskPoint = totalPointPerSubtask * 1;
					let subtask = new Object();
					subtask.finishedOn = buildDate(subtaskFinishedOn);
					subtask.ponto = subtaskPoint;
					issuesDateAndPoint.push(subtask);	
				}
			  });
		});
		finishedIssues = sumPointPerDay(issuesDateAndPoint);

		if(finishedIssues.length > 0)
		{
			var sortedIssues = finishedIssues.sort(function(a,b){
				return buildDate(a.finishedOn) - buildDate(b.finishedOn);
			});
			
			var estimatedPoints = this.effort();
			
			this.dateRange().forEach(function(dt){
				dt = buildDate(dt);
				if(dt <= new Date())
				{
					var currentDate = dt.getUTCDate();
					var performedInDay = 0;		
					sortedIssues.forEach(function(issue){
						if(buildDate(issue.finishedOn).getUTCDate() == currentDate)
						{
							performedInDayTmp = issue.ponto;
							if (performedInDayTmp != 'undefined' && performedInDayTmp != null){
							   performedInDay += issue.ponto;
							} 
						}
					});
					estimatedPoints = estimatedPoints - performedInDay;
					realizedEffort.push(estimatedPoints);			
				}
			});
		}

		return realizedEffort;	
	};

	this._remainingEffort = function()
	{
		var realizedEffort = new Array();
		
		var finishedIssues = this.issues.filter(function(issue){return isIssueFinished(issue);});
		
		if(finishedIssues.length > 0)
		{
			var sortedIssues = finishedIssues.sort(function(a,b){
				return buildDate(a.finishedOn) - buildDate(b.finishedOn);
			});
			
			var estimatedPoints = this.effort();
			
			this.dateRange().forEach(function(dt){
				dt = buildDate(dt);
				if(dt <= new Date())
				{
					var currentDate = dt.getUTCDate();
					var performedInDay = 0;		
					sortedIssues.forEach(function(issue){
						if(buildDate(issue.finishedOn).getUTCDate() == currentDate)
						{
							performedInDayTmp = issue.fields[effortField]
							if (performedInDayTmp != 'undefined' && performedInDayTmp != null){
							   performedInDay += issue.fields[effortField];
							} 
						}
					});
					estimatedPoints = estimatedPoints - performedInDay;
					realizedEffort.push(estimatedPoints);			
				}
			});
		}
		
		return realizedEffort;		
	};
};

function extractSprintData(data)
{
	var activeSprint = data.values[0];
	
	var sprint = new Sprint(
					activeSprint.id,
					activeSprint.name,
					buildDate(activeSprint.startDate),
					buildDate(activeSprint.endDate));

	sprint.nonWorkingDays = getNonWorkingDays(activeSprint.originBoardId);

	return sprint;
}

/**
 * Performs a synchrounous request get the working days 
 * info (not supplied by the standard rest API).
 * @param boardId Sprint Board ID to be analysed.
 * @returns An array containing all non working days (string format).
 */
function getNonWorkingDays(boardId)
{
	var nonWorkingDays = new Array();

	$.ajax({
		
	   url: jiraHost + '/rest/greenhopper/1.0/rapidviewconfig/editmodel.json?rapidViewId='+ boardId,
	   async: false
	   
    }).success(function(boardData) {

		for(i in boardData.workingDaysConfig.nonWorkingDays)
		{
			var workingDay = buildDate(boardData.workingDaysConfig.nonWorkingDays[i].iso8601Date);
			nonWorkingDays.push(workingDay);
		}

	});

	return nonWorkingDays;
}

function isAnWorkingDay(currentDate, nonWorkingDays)
{
	if(currentDate.getDay() == 0 || currentDate.getDay() == 6)
		return false;

	for(i in nonWorkingDays)
	{
		if(currentDate.getTime() == nonWorkingDays[i].getTime())
			return false;
	}
	
	return true;
}

// Checks if the issue (or its specific history) is finished
function isIssueFinished(issue, history)
{
	var status = (issue != null ? issue.fields.status.name : history.items[0].toString + '');
	return $.inArray(status.toUpperCase(), finishedStatus) > -1;
}

function showMsg(msg)
{
	$(chartContainer).html(msg);
}

function getSubTaskFinishedOn(data, subtask){
	
	let subTaskIssuesSprint = data.filter(function(issues){return issues.key===subtask});
	let subTaskFinishedOn = null;
	if (subTaskIssuesSprint.length>0){
		subTaskFinishedOn = subTaskIssuesSprint[0].finishedOn;
	} 
	return subTaskFinishedOn
}

function sumPointPerDay(data) {

	var resultado = [];
  
	data.reduce(function(novo, item) {
	  if (!novo[item.finishedOn]) {
		novo[item.finishedOn] = {
		  ponto: 0,
		  finishedOn: item.finishedOn
		};
  
		resultado.push(novo[item.finishedOn]);
	  }
  
	  novo[item.finishedOn].ponto += item.ponto;
  
	  return novo;
	}, {});
	
	return resultado;
  }