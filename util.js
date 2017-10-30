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
		
		var finishedIssues = this.issues.filter(function(issue){return issue.fields.status.name == 'Finished';});
		
		finishedIssues.forEach(function(issue){
			for(var i = issue.changelog.histories.length-1; i >= 0; i--)
			{
				var history = issue.changelog.histories[i];
				if(history.items[0].toString == "Finished")
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
			points += issue.fields[effortField];
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
		var realizedEffort = new Array();
		
		var finishedIssues = this.issues.filter(function(issue){return issue.fields.status.name == 'Finished';});
		
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
							performedInDay += issue.fields[effortField];
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

function showMsg(msg)
{
	console.log(msg);
	$(container).html(msg);
}