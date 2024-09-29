let processes = [];

function generateTable() {
    let numProcesses = document.getElementById('numProcesses').value;
    
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

        // Simulation logic and Gantt chart generation
        let time = 0;
        let completed = 0;
        let ganttDetails = [];

        while (completed < numProcesses) {
            let executingProcess = processes
                .filter(p => p.arrivalTime <= time && p.remainingTime > 0)
                .sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime)[0];

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
                time++;
            }
        }

        if (ganttDetails.length > 0 && !ganttDetails[ganttDetails.length - 1].endTime) {
            ganttDetails[ganttDetails.length - 1].endTime = time;
        }

        // Gantt chart display logic
        let ganttHTML = '';
        ganttDetails.forEach(g => {
            ganttHTML += `<div class="gantt-block">
                P${g.processId} <br>
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
