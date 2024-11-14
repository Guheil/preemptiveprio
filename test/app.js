let processes = [];

function generateTable() {
    let numProcesses = document.getElementById('numProcesses').value;
    let priorityOrder = document.getElementById('priorityOrder').value;
    
    if (!numProcesses || numProcesses <= 0) {
        showErrorModal("You need to input the number of processes first.");
        return;
    }

    let processTable = document.getElementById('processTable');
    let tbody = document.getElementById('processInputs');

    tbody.innerHTML = ''; 
    processTable.style.display = 'table'; 

    for (let i = 0; i < numProcesses; i++) {
        let row = `<tr>
            <td>P${i + 1}</td>
            <td><input type="number" id="arrivalTime${i}" class="form-control" required></td>
            <td><input type="number" id="burstTime${i}" class="form-control" required></td>
            <td><input type="number" id="priority${i}" class="form-control" min="1" max="5" required></td>
        </tr>`;
        tbody.innerHTML += row;
    }
}

function showErrorModal(message) {
    document.getElementById('errorMessage').innerText = message;
    let errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
}

function highlightError(inputId) {
    const inputField = document.getElementById(inputId);
    inputField.classList.add('is-invalid');
}

function resetHighlights() {
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => input.classList.remove('is-invalid'));
}

function validateForm(numProcesses) {
    resetHighlights(); 

    for (let i = 0; i < numProcesses; i++) {
        let arrivalTime = document.getElementById(`arrivalTime${i}`).value;
        let burstTime = document.getElementById(`burstTime${i}`).value;
        let priority = document.getElementById(`priority${i}`).value;

        if (!arrivalTime || !burstTime || !priority) {
            showErrorModal("All fields must be filled.");
            return false;
        }

        if (arrivalTime < 0 || burstTime < 0 || priority < 0 || /[^0-9]/.test(arrivalTime) || /[^0-9]/.test(burstTime) || /[^0-9]/.test(priority)) {
            showErrorModal("Negative values and special characters are not allowed.");
            if (arrivalTime < 0 || /[^0-9]/.test(arrivalTime)) {
                highlightError(`arrivalTime${i}`);
            }
            if (burstTime < 0 || /[^0-9]/.test(burstTime)) {
                highlightError(`burstTime${i}`);
            }
            if (priority < 0 || /[^0-9]/.test(priority)) {
                highlightError(`priority${i}`);
            }
            return false;
        }

        if ((arrivalTime.length > 1 && arrivalTime.startsWith('0'))) {
            showErrorModal("Leading zeros are not allowed for multi-digit arrival times.");
            highlightError(`arrivalTime${i}`);
            return false;
        }
        if ((burstTime.length > 1 && burstTime.startsWith('0'))) {
            showErrorModal("Leading zeros are not allowed for multi-digit burst times.");
            highlightError(`burstTime${i}`);
            return false;
        }

        if (priority < 1 || priority > 5) {
            showErrorModal(`Priority for P${i + 1} must be between 1 and 5.`);
            highlightError(`priority${i}`);
            return false;
        }
    }
    return true;
}

function calculateScheduling() {
    let numProcesses = document.getElementById('numProcesses').value;

    if (!numProcesses || numProcesses <= 0) {
        showErrorModal("You need to generate the process table first.");
        return;
    }

    if (!validateForm(numProcesses)) {
        return;
    }

    let loaderModal = new bootstrap.Modal(document.getElementById('loaderModal'));
    loaderModal.show();
    document.getElementById('results').style.display = 'none';

    setTimeout(() => {
        processes = [];
        let totalBurstTime = 0;

        for (let i = 0; i < numProcesses; i++) {
            let burstTime = parseInt(document.getElementById(`burstTime${i}`).value);

            processes.push({
                id: i + 1,
                arrivalTime: parseInt(document.getElementById(`arrivalTime${i}`).value),
                burstTime: burstTime,
                priority: parseInt(document.getElementById(`priority${i}`).value),
                remainingTime: burstTime,
                completionTime: 0,
                waitingTime: 0,
                turnaroundTime: 0
            });

            totalBurstTime += burstTime;
        }

        let time = 0;
        let completed = 0;
        let ganttDetails = [];
        const priorityOrder = document.getElementById('priorityOrder').value;

        while (completed < numProcesses) {
            let executingProcess = processes
                .filter(p => p.arrivalTime <= time && p.remainingTime > 0)
                .sort((a, b) => {
                    if (priorityOrder === 'high') {
                        return a.priority - b.priority;
                    } else {
                        return b.priority - a.priority;
                    }
                })[0];

            if (executingProcess) {
                if (ganttDetails.length === 0 || ganttDetails[ganttDetails.length - 1].processId !== executingProcess.id) {
                    if (ganttDetails.length > 0 && !ganttDetails[ganttDetails.length - 1].endTime) {
                        ganttDetails[ganttDetails.length - 1].endTime = time;
                    }

                    ganttDetails.push({
                        processId: executingProcess.id,
                        startTime: time,
                        endTime: null
                    });
                }

                executingProcess.remainingTime--;
                time++;

                if (executingProcess.remainingTime === 0) {
                    executingProcess.completionTime = time;
                    executingProcess.turnaroundTime = executingProcess.completionTime - executingProcess.arrivalTime;
                    executingProcess.waitingTime = executingProcess.turnaroundTime - executingProcess.burstTime;
                    completed++;

                    ganttDetails[ganttDetails.length - 1].endTime = time;
                }
            } else {
                if (ganttDetails.length === 0 || ganttDetails[ganttDetails.length - 1].processId !== 'idle') {
                    if (ganttDetails.length > 0 && !ganttDetails[ganttDetails.length - 1].endTime) {
                        ganttDetails[ganttDetails.length - 1].endTime = time;
                    }

                    ganttDetails.push({
                        processId: 'idle',  
                        startTime: time,
                        endTime: null
                    });
                }
                time++;
            }
        }

        if (ganttDetails.length > 0 && !ganttDetails[ganttDetails.length - 1].endTime) {
            ganttDetails[ganttDetails.length - 1].endTime = time;
        }

        let ganttHTML = '';
        ganttDetails.forEach(g => {
            let colorClass = g.processId === 'idle' ? 'gantt-idle' : 'gantt-process';
            ganttHTML += `<div class="gantt-block ${colorClass}">
                ${g.processId === 'idle' ? 'Idle' : 'P' + g.processId} <br>
                <span>(${g.startTime} - ${g.endTime})</span>
            </div>`;
        });

        document.getElementById('ganttChart').innerHTML = ganttHTML;
        document.getElementById('results').style.display = 'block';

        let totalTAT = 0;
        let totalWT = 0;

        processes.forEach(p => {
            totalTAT += p.turnaroundTime;
            totalWT += p.waitingTime;
        });

        let avgTAT = (totalTAT / numProcesses).toFixed(2);
        let avgWT = (totalWT / numProcesses).toFixed(2);

        document.getElementById('totalTAT').innerText = totalTAT;
        document.getElementById('avgTAT').innerText = avgTAT;
        document.getElementById('totalWT').innerText = totalWT;
        document.getElementById('avgWT').innerText = avgWT;
        document.getElementById('cpuUtilization').innerText = `${((time - processes[0].arrivalTime) / time * 100).toFixed(2)}%`;
        document.getElementById('throughput').innerText = `${((numProcesses / totalBurstTime) * 100).toFixed(2)}`;

        loaderModal.hide();
    }, 1000);
}

function generateTutorial() {
    const numProcesses = document.getElementById('numProcesses').value;
    const tutorialContent = document.getElementById('tutorialContent');
    
    tutorialContent.innerHTML = '';

    if (!numProcesses || numProcesses <= 0) {
        showErrorModal("You need to generate the process table first.");
        return;
    }

    // Gather process information
    let processDetails = [];
    for (let i = 0; i < numProcesses; i++) {
        processDetails.push({
            id: i + 1,
            arrivalTime: parseInt(document.getElementById(`arrivalTime${i}`).value),
            burstTime: parseInt(document.getElementById(`burstTime${i}`).value),
            priority: parseInt(document.getElementById(`priority${i}`).value),
            remainingTime: parseInt(document.getElementById(`burstTime${i}`).value)
        });
    }

    // Sort processes by arrival time for initial explanation
    processDetails.sort((a, b) => a.arrivalTime - b.arrivalTime);

    // Get the selected priority order
    const priorityOrder = document.getElementById('priorityOrder').value;
    const priorityOrderText = priorityOrder === 'high' ? '1 (High) - 5 (Low)' : '5 (High) - 1 (Low)';

    // Create initial explanation
    let tutorialHTML = `
        <div class="tutorial-section mb-4">
            <h4 class="mb-3">Initial Process Analysis</h4>
            <p>We have ${numProcesses} processes to schedule using Priority Scheduling (Preemptive). Here's how they arrive:</p>
            <div class="process-timeline mb-3">
                ${processDetails.map(p => `
                    <div class="timeline-entry">
                        <strong>Time ${p.arrivalTime}</strong>: P${p.id} arrives (Priority: ${p.priority})
                    </div>
                `).join('')}
            </div>
            <p>The selected priority order is: ${priorityOrderText}</p>
        </div>
    `;

    // Simulate the scheduling process for explanation
    let time = 0;
    let completed = 0;
    let timelineEvents = [];
    let currentProcess = null;

    while (completed < numProcesses) {
        // Find eligible processes at current time
        let eligibleProcesses = processDetails
            .filter(p => p.arrivalTime <= time && p.remainingTime > 0)
            .sort((a, b) => {
                // Adjust sorting based on selected priority order
                return priorityOrder === 'high' ? a.priority - b.priority : b.priority - a.priority;
            });

        if (eligibleProcesses.length > 0) {
            let selectedProcess = eligibleProcesses[0];
            
            if (currentProcess !== selectedProcess.id) {
                timelineEvents.push({
                    time: time,
                    type: 'switch',
                    process: selectedProcess,
                    readyQueue: eligibleProcesses.slice(1).map(p => `P${p.id}`)
                });
                currentProcess = selectedProcess.id;
            }

            selectedProcess.remainingTime--;
            
            if (selectedProcess.remainingTime === 0) {
                timelineEvents.push({
                    time: time + 1,
                    type: 'complete',
                    process: selectedProcess
                });
                completed++;
                currentProcess = null;
            }
        } else {
            // Handle idle time
            timelineEvents.push({
                time: time,
                type: 'idle',
                readyQueue: [],
                idleReason: 'No processes are ready to execute.'
            });
            currentProcess = null;
        }
        time++;
    }

    // Generate detailed explanation of events
    tutorialHTML += `
        <div class="tutorial-section mb-4">
            <h4 class="mb-3">Scheduling Process Explanation</h4>
            <p>The scheduling process is based on the selected priority order: ${priorityOrderText}. This means:</p>
            <ul>
                <li>If the priority order is set to "1 (High) - 5 (Low)", the process with the lowest priority number (highest priority) will be executed first.</li>
                <li>If the priority order is set to "5 (High) - 1 (Low)", the process with the highest priority number (lowest priority) will be executed first.</li>
            </ul>
            ${timelineEvents.map(event => {
                let explanation = '';
                switch (event.type) {
                    case 'switch':
                        explanation = `
                            <div class="event-entry mb-2">
                                <strong>At time ${event.time}:</strong>
                                <ul>
                                    <li>P${event.process.id} is selected for execution (Priority: ${event.process.priority})</li>
                                    ${event.readyQueue.length > 0 ? 
                                        `<li>Ready Queue: ${event.readyQueue.join(', ')}</li>` : 
                                        '<li>No other processes in ready queue</li>'}
                                    <li>Reason: Highest priority among ready processes</li>
                                </ul>
                            </div>
                        `;
                        break;
                    case 'complete':
                        explanation = `
                            <div class="event-entry mb-2">
                                <strong>At time ${event.time}:</strong>
                                <ul>
                                    <li>P${event.process.id} has completed execution</li>
                                    <li>Total time taken: ${event.time - event.process.arrivalTime} units</li>
                                </ul>
                            </div>
                        `;
                        break;
                    case 'idle':
                        explanation = `
                            <div class="event-entry idle-entry mb-2">
                                <strong>At time ${event.time}:</strong>
                                <ul>
                                    <li>CPU is idle</li>
                                    <li>Reason: ${event.idleReason}</li>
                                </ul>
                            </div>
                        `;
                        break;
                }
                return explanation;
            }).join('')}
        </div>
    `;

    // Add custom styling for tutorial elements
    const style = document.createElement('style');
    style.textContent = `
        .tutorial-section {
            background-color: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .event-entry {
            border-left: 3px solid #007bff;
            padding-left: 1rem;
            margin-bottom: 1rem;
        }
        .idle-entry {
            border-left: 3px solid #dc3545;
            background-color: #fff3f3;
        }
        .timeline-entry {
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background-color: #e9ecef;
            border-radius: 4px;
        }
        .process-timeline {
            border-left: 2px solid #6c757d;
            padding-left: 1rem;
            margin-left: 1rem;
        }

        body.dark-mode {
            background-color: #121212;
            color: #f8f9fa;  
        }

        body.dark-mode .tutorial-section {
            background-color: #2e2e2e; 
            color: #f8f9fa; 
        }

        body.dark-mode .event-entry {
            border-left: 3px solid #007bff;
            background-color: #2c2f37; 
            color: #f8f9fa; /
        }

        body.dark-mode .idle-entry {
            border-left: 3px solid #dc3545;
            background-color: #4f3333; 
            color: #f8f9fa;  
        }

        body.dark-mode .timeline-entry {
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background-color: #3a3f47; 
            border-radius: 4px;
            color: #f8f9fa; 
        }

        body.dark-mode .process-timeline {
            border-left: 2px solid #6c757d;
            padding-left: 1rem;
            margin-left: 1rem;
            color: #f8f9fa;  
        }
    `;
    document.head.appendChild(style);

    tutorialContent.innerHTML = tutorialHTML;
    tutorialContent.style.display = 'block';
}