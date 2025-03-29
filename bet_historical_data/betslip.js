document.getElementById('ingestButton').addEventListener('click', () => {
    const inputText = document.getElementById('inputArea').value;
    const parsedData = parseInput(inputText);
    displayData(parsedData);
});

function parseInput(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const data = [];
    let currentEntry = {};

    lines.forEach((line, index) => {
        // Match date and time (e.g., "02/12 01:00")
        const dateMatch = line.match(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
        if (dateMatch) {
            if (Object.keys(currentEntry).length) data.push(currentEntry); // Save the previous entry
            currentEntry = { date: dateMatch[0], gameId: '', teams: '', scores: '', pick: '', market: '', result: '', outcome: '' };
            return;
        }

        // Match Game ID (e.g., "Game ID: 15597")
        const gameIdMatch = line.match(/^Game ID: (\d+)$/);
        if (gameIdMatch) {
            currentEntry.gameId = gameIdMatch[1];
            return;
        }

        // Match outcome (e.g., "Won" or "Lost")
        if (line === 'Won' || line === 'Lost') {
            currentEntry.outcome = line;
            return;
        }

        // Match team names
        if (!currentEntry.teams && /^[A-Za-z\s]+$/.test(line)) {
            const teamA = line; // Team A name
            const teamB = lines[index + 1]; // Team B name is the next line
            if (/^[A-Za-z\s]+$/.test(teamB)) {
                currentEntry.teams = `${teamA} vs ${teamB}`;
            }
            return;
        }

        // Match team scores (Team A and Team B)
        const scoreMatch = line.match(/^\d+$/);
        if (scoreMatch) {
            const teamAScore = line; // Current line is Team A score
            const teamBScore = lines[index + 1]; // Next line is Team B score
            if (/^\d+$/.test(teamBScore)) { // Validate Team B score
                currentEntry.scores = `${teamAScore} - ${teamBScore}`;
            }
            return;
        }

        // Match pick (e.g., "Pick Over 149.5 @1.85")
        if (line.startsWith('Pick')) {
            currentEntry.pick = lines[index + 1]; // Next line has the pick details
            return;
        }

        // Match market (e.g., "Market Over/Under (incl. overtime) 149.5")
        if (line.startsWith('Market')) {
            currentEntry.market = lines[index + 1]; // Next line has the market details
            return;
        }

        // Match result (e.g., "Result Over 149.5")
        if (line.startsWith('Result')) {
            currentEntry.result = lines[index + 1]; // Next line has the result details
            return;
        }
    });

    if (Object.keys(currentEntry).length) data.push(currentEntry); // Add the last entry
    return data;
}

function calculateTeamPerformance(data) {
    const teamStats = {};
    data.forEach(entry => {
        const [teamA, teamB] = entry.teams.split(' vs ');
        const [scoreA, scoreB] = entry.scores.split(' - ').map(Number);
        const totalScore = scoreA + scoreB;

        const thresholdMatch = entry.market.match(/Over\/Under \((\d+\.?\d*)\)/);
        if (!thresholdMatch) return;
        const threshold = parseFloat(thresholdMatch[1]);

        // Update stats for both teams
        [teamA, teamB].forEach(team => {
            if (!teamStats[team]) {
                teamStats[team] = { totalGames: 0, overGames: 0, underGames: 0 };
            }
            teamStats[team].totalGames++;
            if (totalScore > threshold) {
                teamStats[team].overGames++;
            } else {
                teamStats[team].underGames++;
            }
        });
    });

    // Calculate percentages
    Object.keys(teamStats).forEach(team => {
        const stats = teamStats[team];
        stats.overPercentage = ((stats.overGames / stats.totalGames) * 100).toFixed(2);
        stats.underPercentage = ((stats.underGames / stats.totalGames) * 100).toFixed(2);
    });

    return teamStats;
}

function calculateWinRate(data) {
    const totalBets = data.length;
    const wonBets = data.filter(entry => entry.outcome === 'Won').length;
    return ((wonBets / totalBets) * 100).toFixed(2);
}

function findMode(data, field) {
    const frequency = {};
    data.forEach(entry => {
        if (entry[field]) {
            frequency[entry[field]] = (frequency[entry[field]] || 0) + 1;
        }
    });

    let maxFrequency = 0;
    let mode = null;
    Object.keys(frequency).forEach(key => {
        if (frequency[key] > maxFrequency) {
            maxFrequency = frequency[key];
            mode = key;
        }
    });

    return { mode, frequency };
}

function filterTeamsBySuitability(teamStats, threshold = 70) {
    const overTeams = [];
    const underTeams = [];
    Object.keys(teamStats).forEach(team => {
        if (teamStats[team].overPercentage > threshold) {
            overTeams.push(team);
        } else if (teamStats[team].overPercentage < 100 - threshold) {
            underTeams.push(team);
        }
    });
    return { overTeams, underTeams };
}

function displayAnalytics(data) {
    const teamStats = calculateTeamPerformance(data);
    const winRate = calculateWinRate(data);
    const mostFrequentTeam = findMode(data, 'teams');
    const suitability = filterTeamsBySuitability(teamStats);

    const analyticsDiv = document.getElementById('analytics');
    analyticsDiv.innerHTML = `
        <h2>Analytics Summary</h2>
        <p>Win Rate: ${winRate}%</p>
        <p>Most Frequent Team: ${mostFrequentTeam.mode} (${mostFrequentTeam.frequency[mostFrequentTeam.mode]} games)</p>
        <h3>Team Performance in Over/Under</h3>
        ${Object.keys(teamStats).map(team => `
            <p>${team}: Over ${teamStats[team].overPercentage}% / Under ${teamStats[team].underPercentage}%</p>
        `).join('')}
        <h3>Teams Suited for Over Bets</h3>
        <p>${suitability.overTeams.join(', ')}</p>
        <h3>Teams Suited for Under Bets</h3>
        <p>${suitability.underTeams.join(', ')}</p>
    `;
}


function displayData(data) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';

    if (data.length === 0) {
        outputDiv.innerHTML = '<p>No data found. Please check your input.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Game ID</th>
                <th>Teams</th>
                <th>Scores</th>
                <th>Pick</th>
                <th>Market</th>
                <th>Result</th>
                <th>Outcome</th>
            </tr>
        </thead>
        <tbody>
            ${data.map(entry => `
                <tr>
                    <td>${entry.date}</td>
                    <td>${entry.gameId}</td>
                    <td>${entry.teams}</td>
                    <td>${entry.scores}</td>
                    <td>${entry.pick}</td>
                    <td>${entry.market}</td>
                    <td>${entry.result}</td>
                    <td>${entry.outcome}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    outputDiv.appendChild(table);
}
