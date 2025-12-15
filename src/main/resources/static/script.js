const API_BASE = '/api/admin';

// Store current data globally
let currentContributions = [];
let currentSocietyId = null;
let currentSocietyData = null;
let currentFuneralHistory = []; // NEW: Stores history for the "View Items" button

let memberBalanceMap = {};
let expenseItems = [];

// --- Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(sec => {
        sec.classList.remove('active-section');
        sec.classList.add('hidden-section');
    });
    
    document.getElementById(sectionId).classList.remove('hidden-section');
    document.getElementById(sectionId).classList.add('active-section');

    if (sectionId === 'dashboard') loadSocieties();
    if (sectionId === 'add-member') loadDropdowns();
    if (sectionId === 'contributions') loadMemberDropdown('contribMemberSelect');
    if (sectionId === 'funerals') loadMemberDropdown('funeralMemberSelect');
    if (sectionId === 'history') loadFuneralHistory(); 
}

// --- Dashboard ---
async function loadSocieties() {
    const container = document.getElementById('society-cards');
    container.innerHTML = 'Loading...';
    try {
        const res = await fetch(`${API_BASE}/societies`);
        const data = await res.json();
        
        container.innerHTML = '';
        data.forEach(soc => {
            const div = document.createElement('div');
            div.className = 'card';
            div.onclick = () => viewSocietyDetails(soc);
            div.style.cursor = 'pointer';
            
            div.innerHTML = `
                <h3>${soc.name}</h3>
                <div style="font-size:0.9rem; color:#666;">Acc: ${soc.accountNumber || 'N/A'}</div>
                <div class="money">R ${soc.currentBalance.toFixed(2)}</div>
                <p>${soc.members ? soc.members.length : 0} Members</p>
                <small style="color:blue">Click to view details</small>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = 'Error loading data.';
    }
}

// --- VIEW SOCIETY DETAILS ---
async function viewSocietyDetails(society) {
    currentSocietyId = society.id;
    currentSocietyData = society;
    document.getElementById('detailTitle').innerText = society.name;
    
    document.getElementById('editSocietyContainer').style.display = 'none';

    // 1. Populate Members Table
    const memBody = document.getElementById('membersTableBody');
    memBody.innerHTML = '';
    
    if(society.members && society.members.length > 0) {
        society.members.forEach(m => {
            const typeBadge = m.memberType === 'PRIMARY' 
                ? '<span class="badge badge-primary">Primary</span>' 
                : '<span class="badge badge-ben">Beneficiary</span>';
            const statusBadge = m.deceased 
                ? '<span class="badge badge-deceased">Deceased</span>' 
                : '<span class="badge badge-active">Active</span>';
            const linkedName = m.primaryMember 
                ? `${m.primaryMember.firstName} ${m.primaryMember.lastName}` 
                : '-';

            memBody.innerHTML += `<tr><td>${m.idNumber}</td><td>${m.firstName} ${m.lastName}</td><td>${typeBadge}</td><td>${linkedName}</td><td>${statusBadge}</td></tr>`;
        });
    } else {
        memBody.innerHTML = '<tr><td colspan="5">No members found.</td></tr>';
    }

    // 2. Fetch Contributions
    await loadSocietyContributions(society.id);
    showSection('society-details');
}

async function loadSocietyContributions(societyId) {
    const tbody = document.getElementById('contribTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    
    const res = await fetch(`${API_BASE}/contributions/society/${societyId}`);
    currentContributions = await res.json();
    renderContributionsTable();
}

// --- EDIT SOCIETY LOGIC ---
function toggleEditSociety() {
    const container = document.getElementById('editSocietyContainer');
    if (container.style.display === 'none') {
        document.getElementById('editSocietyId').value = currentSocietyData.id;
        document.getElementById('editSocietyName').value = currentSocietyData.name;
        document.getElementById('editSocietyAccNo').value = currentSocietyData.accountNumber || '';
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

document.getElementById('updateSocietyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editSocietyId').value;
    const payload = {
        name: document.getElementById('editSocietyName').value,
        accountNumber: document.getElementById('editSocietyAccNo').value
    };

    const res = await fetch(`${API_BASE}/society/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Society Updated Successfully!');
        showSection('dashboard');
    } else {
        alert('Error updating society');
    }
});

function renderContributionsTable() {
    const tbody = document.getElementById('contribTableBody');
    tbody.innerHTML = '';
    let total = 0;
    
    if(currentContributions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No contributions recorded.</td></tr>';
    } else {
        currentContributions.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

        currentContributions.forEach(c => {
            total += c.amount;
            const dateStr = new Date(c.paymentDate).toLocaleDateString();
            tbody.innerHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${c.member.firstName} ${c.member.lastName}</td>
                    <td>R ${c.amount.toFixed(2)}</td>
                    <td>${c.notes || '-'}</td>
                    <td><button class="action-btn" style="padding:5px 10px; font-size:12px;" onclick="printHistoricalReceipt(${c.id})">🖨️ Print</button></td>
                </tr>`;
        });
    }
    document.getElementById('totalContributions').innerText = `R ${total.toFixed(2)}`;
}

// --- PRINT LOGIC ---

function printHistoricalReceipt(contributionId) {
    const contrib = currentContributions.find(c => c.id === contributionId);
    
    if (contrib) {
        generateReceipt(contrib);
    } else {
        alert("Error: Could not find receipt data.");
    }
}

document.getElementById('contributionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('contribMemberSelect').value;
    const amount = parseFloat(document.getElementById('contribAmount').value);
    const notes = document.getElementById('contribNotes').value;
    
    // 1. GET PAYMENT METHOD
    const method = document.getElementById('contribMethod').value;

    // 2. SEND TO BACKEND
    const res = await fetch(`${API_BASE}/contribution?memberId=${memberId}&amount=${amount}&notes=${notes}&paymentMethod=${method}`, { method: 'POST' });
    
    if (res.ok) {
        const contribution = await res.json();
        generateReceipt(contribution);
        document.getElementById('contributionForm').reset();
    } else {
        alert('Error recording payment');
    }
});

// function generateReceipt(contribution) {
//     document.getElementById('recNo').innerText = contribution.id;
//     document.getElementById('recAccNo').innerText = contribution.society.accountNumber || "N/A";

//     // 3. SHOW PAYMENT METHOD ON RECEIPT
//     const method = contribution.paymentMethod || "Cash";
//     document.getElementById('recMethod').innerText = method; // Top box
//     document.getElementById('recType').innerText = method;   // Bottom box

//     const dateObj = new Date(contribution.paymentDate);
//     document.getElementById('recDate').innerText = dateObj.toLocaleDateString();
    
//     document.getElementById('recSociety').innerText = contribution.society.name;
//     document.getElementById('recMember').innerText = `${contribution.member.firstName} ${contribution.member.lastName}`;
//     document.getElementById('recAmount').innerText = `R ${contribution.amount.toFixed(2)}`;
//     document.getElementById('recBalance').innerText = `R ${contribution.society.currentBalance.toFixed(2)}`;
//     document.getElementById('recWords').innerText = numberToWords(contribution.amount) + " Rands Only";

//     setTimeout(() => { window.print(); }, 200);
// }
// 1. Contribution Receipt (Existing)
function generateReceipt(contribution) {
    // Set Active Template
    document.getElementById('receipt-print-area').classList.add('print-active');
    document.getElementById('funeral-print-area').classList.remove('print-active');

    // Fill Data
    document.getElementById('recNo').innerText = contribution.id;
    document.getElementById('recAccNo').innerText = contribution.society.accountNumber || "N/A";
    
    const method = contribution.paymentMethod || "Cash";
    document.getElementById('recMethod').innerText = method;
    document.getElementById('recType').innerText = method;

    const dateObj = new Date(contribution.paymentDate);
    document.getElementById('recDate').innerText = dateObj.toLocaleDateString();
    
    document.getElementById('recSociety').innerText = contribution.society.name;
    document.getElementById('recMember').innerText = `${contribution.member.firstName} ${contribution.member.lastName}`;
    document.getElementById('recAmount').innerText = `R ${contribution.amount.toFixed(2)}`;
    document.getElementById('recBalance').innerText = `R ${contribution.society.currentBalance.toFixed(2)}`;
    document.getElementById('recWords').innerText = numberToWords(contribution.amount) + " Rands Only";

    // Print
    setTimeout(() => { 
        window.print(); 
        // Cleanup class after print dialog closes (optional but good practice)
        document.getElementById('receipt-print-area').classList.remove('print-active');
    }, 200);
}

// --- FUNERAL HISTORY ---
async function loadFuneralHistory() {
    const tbody = document.getElementById('funeralHistoryBody');
    tbody.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/funerals`);
        const funerals = await res.json();
        
        // Save to global variable for button clicks
        currentFuneralHistory = funerals;

        tbody.innerHTML = '';
        if (funerals.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="10">No history.</td></tr>'; 
            return; 
        }
        
        funerals.sort((a, b) => new Date(b.funeralDate) - new Date(a.funeralDate));
        
        funerals.forEach(f => {
            const dateStr = new Date(f.funeralDate).toLocaleDateString();
            
            // Check if deceasedMember exists to prevent crashes
            const memberName = f.deceasedMember 
                ? `${f.deceasedMember.firstName} ${f.deceasedMember.lastName}` 
                : 'Unknown';
                
            const balBefore = f.societyBalanceBefore !== null ? `R ${f.societyBalanceBefore.toFixed(2)}` : '-';
            const balAfter = f.societyBalanceAfter !== null ? `R ${f.societyBalanceAfter.toFixed(2)}` : '-';
            
            // FIXED TEMPLATE STRING BELOW
            tbody.innerHTML += `<tr>
                <td>${dateStr}</td>
                <td>${memberName}</td>
                <td>${f.society.name}</td>
                <td>${f.graveNumber || '-'}</td>
                <td style="font-weight:bold">R ${f.totalCost.toFixed(2)}</td>
                <td style="color:green">R ${f.paidBySociety.toFixed(2)}</td>
                <td style="color:#7f8c8d"><small>${balBefore}</small></td>
                <td style="color:#2c3e50; font-weight:bold">${balAfter}</td>
                <td style="color:red">R ${f.paidByFamily.toFixed(2)}</td>
                <td style="display:flex; gap:3px;">
                    <button class="action-btn" title="View Items" style="padding:2px 5px;" onclick="viewFuneralDetails(${f.id})">🔍</button>
                    <button class="action-btn" title="Statement" style="padding:2px 5px;" onclick="printFuneralReceipt(${f.id})">🧾</button>
                    <button class="action-btn" title="Green Form" style="padding:2px 5px;" onclick="printGreenForm(${f.id})">📄</button>
                    <button class="action-btn" title="Edit Info" style="padding:2px 5px; background:#f39c12;" onclick="openEditFuneralModal(${f.id})">✏️</button>
                </td>
            </tr>`;
        });
    } catch (e) { 
        console.error(e); 
        tbody.innerHTML = '<tr><td colspan="10">Error loading history.</td></tr>';
    }
}

// 6. NEW FUNCTION TO SHOW DETAILS SAFELY
function viewFuneralDetails(funeralId) {
    const funeral = currentFuneralHistory.find(f => f.id === funeralId);
    if (!funeral) return;

    let details = "Expenses:\n";
    if (funeral.expenses && funeral.expenses.length > 0) {
        funeral.expenses.forEach(e => {
            details += `- ${e.itemName}: R ${e.cost.toFixed(2)}\n`;
        });
    } else {
        details += "No expenses recorded.\n";
    }

    if (funeral.specialInstructions) {
        details += `\nInstructions:\n${funeral.specialInstructions}`;
    }

    alert(details);
}

// --- Sorting Logic ---
function sortContributions(criteria) {
    if(criteria === 'amount') {
        currentContributions.sort((a, b) => b.amount - a.amount);
    } else if (criteria === 'date') {
        currentContributions.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    } else if (criteria === 'name') {
        currentContributions.sort((a, b) => 
            a.member.firstName.localeCompare(b.member.firstName)
        );
    }
    renderContributionsTable();
}

// --- Create Society ---
document.getElementById('societyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('societyName').value,
        accountNumber: document.getElementById('societyAccNo').value,
        currentBalance: document.getElementById('societyBalance').value
    };
    const res = await fetch(`${API_BASE}/society`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) { alert('Society Created!'); showSection('dashboard'); }
});

// --- Helper Dropdowns ---
async function loadDropdowns() {
    const resSoc = await fetch(`${API_BASE}/societies`);
    const societies = await resSoc.json();
    const socSelect = document.getElementById('memSocietySelect');
    socSelect.innerHTML = '';
    societies.forEach(s => { socSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`; });

    const primSelect = document.getElementById('linkedPrimaryMember');
    primSelect.innerHTML = '';
    let primaryMembers = [];
    societies.forEach(s => {
        if(s.members) {
            s.members.forEach(m => {
                if(m.memberType === 'PRIMARY') primaryMembers.push(m);
            });
        }
    });
    primaryMembers.forEach(m => {
        primSelect.innerHTML += `<option value="${m.id}">${m.firstName} ${m.lastName}</option>`;
    });
}
function togglePrimaryMemberSelect() {
    const type = document.getElementById('memType').value;
    document.getElementById('primaryMemberDiv').style.display = (type === 'BENEFICIARY') ? 'block' : 'none';
}

// --- Add Member ---
document.getElementById('memberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('memType').value;
    const payload = {
        firstName: document.getElementById('memFirstName').value,
        lastName: document.getElementById('memLastName').value,
        idNumber: document.getElementById('memIdNumber').value,
        memberType: type,
        society: { id: document.getElementById('memSocietySelect').value }
    };
    if (type === 'BENEFICIARY') {
        payload.primaryMember = { id: document.getElementById('linkedPrimaryMember').value };
    }
    const res = await fetch(`${API_BASE}/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) { alert('Member Added!'); document.getElementById('memberForm').reset(); } 
    else { alert('Error adding member'); }
});

// --- Load Members for Dropdown (With Balance Map) ---
async function loadMemberDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">-- Select Member --</option>';
    
    const res = await fetch(`${API_BASE}/societies`);
    const societies = await res.json();
    
    // Reset Map
    memberBalanceMap = {};

    societies.forEach(s => {
        if(s.members) {
            s.members.forEach(m => {
                // Filter logic
                if(elementId === 'contribMemberSelect' && m.deceased) return;
                if(elementId === 'contribMemberSelect' && m.memberType !== 'PRIMARY') return;

                // Store Balance for Funeral logic
                memberBalanceMap[m.id] = s.currentBalance;

                select.innerHTML += `<option value="${m.id}">${m.firstName} ${m.lastName} (${s.name})</option>`;
            });
        }
    });
}

// --- Funeral: Update Balance Display ---
function updateSocietyBalanceDisplay() {
    const memId = document.getElementById('funeralMemberSelect').value;
    const display = document.getElementById('budgetDisplay');
    
    if(memId && memberBalanceMap[memId] !== undefined) {
        display.innerText = `Society Balance: R ${memberBalanceMap[memId]}`;
    } else {
        display.innerText = 'Society Balance: R 0.00'; 
    }
}

// --- Funeral: Expense List Logic ---
function addExpenseItem() {
    const nameInput = document.getElementById('newItemName');
    const costInput = document.getElementById('newItemCost');
    
    const name = nameInput.value;
    const cost = parseFloat(costInput.value);

    if(!name || isNaN(cost)) {
        alert('Please enter valid item and cost');
        return;
    }

    expenseItems.push({ name, cost });
    
    // Clear inputs
    nameInput.value = '';
    costInput.value = '';
    
    renderExpenseTable();
}

function removeExpenseItem(index) {
    expenseItems.splice(index, 1);
    renderExpenseTable();
}

function renderExpenseTable() {
    const tbody = document.getElementById('expenseListBody');
    tbody.innerHTML = '';
    let total = 0;

    expenseItems.forEach((item, index) => {
        total += item.cost;
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>R ${item.cost.toFixed(2)}</td>
                <td><button class="remove-btn" onclick="removeExpenseItem(${index})">X</button></td>
            </tr>
        `;
    });

    document.getElementById('displayTotalCost').innerText = `R ${total.toFixed(2)}`;
}

// --- Funeral: Final Submission ---
// 1. UPDATE submitFuneral() to include all new fields
async function submitFuneral() {
    const memberId = document.getElementById('funeralMemberSelect').value;
    const societyPays = parseFloat(document.getElementById('societyPays').value) || 0;

    if(!memberId || expenseItems.length === 0) {
        alert('Please select a member and add items.'); return;
    }

    const payload = {
        memberId: parseInt(memberId),
        societyPays: societyPays,
        // Bio & Address
        branchCode: document.getElementById('fBranch').value,
        countryOfBirth: document.getElementById('fCountry').value,
        sex: document.getElementById('fSex').value,
        maritalStatus: document.getElementById('fMarital').value,
        dateOfBirth: document.getElementById('fDob').value,
        occupation: document.getElementById('fOccupation').value,
        address: document.getElementById('fAddress').value,
        // Death
        dateOfDeath: document.getElementById('fDateDeath').value,
        placeOfDeath: document.getElementById('fPlaceDeath').value,
        causeOfDeath: document.getElementById('fCause').value,
        doctorName: document.getElementById('fDoctor').value,
        nextOfKin: document.getElementById('fNextKin').value,
        // Logistics
        dateOfBurial: document.getElementById('fDateBurial').value,
        timeOfBurial: document.getElementById('fTimeBurial').value,
        religion: document.getElementById('fReligion').value,
        minister: document.getElementById('fMinister').value,
        funeralVenue: document.getElementById('fVenue').value,
        placeOfBurial: document.getElementById('fPlaceBurial').value,
        cemetery: document.getElementById('fCemetery').value,
        graveNo: document.getElementById('fGraveNo').value,
        graveType: document.getElementById('fGraveType').value,
        hearseRequired: document.getElementById('fHearse').checked,
        mournersCarRequired: document.getElementById('fCar').checked,
        instructions: document.getElementById('fInstructions').value,
        // Items
        items: expenseItems
    };

    const res = await fetch(`${API_BASE}/funeral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Funeral Recorded Successfully');
        document.getElementById('funeralForm').reset();
        expenseItems = [];
        renderExpenseTable();
        showSection('history'); // Go to history to print form
    } else {
        alert('Error recording funeral');
    }
}

// --- NEW: EDIT FUNERAL MODAL LOGIC ---

function openEditFuneralModal(funeralId) {
    const f = currentFuneralHistory.find(x => x.id === funeralId);
    if (!f) return;

    // Populate Fields
    document.getElementById('editFunId').value = f.id;
    document.getElementById('efBranch').value = f.branchCode || '';
    document.getElementById('efCountry').value = f.countryOfBirth || '';
    document.getElementById('efOccupation').value = f.occupation || '';
    document.getElementById('efReligion').value = f.religion || '';
    document.getElementById('efDoctor').value = f.doctorName || '';
    document.getElementById('efCause').value = f.causeOfDeath || '';
    document.getElementById('efPlaceDeath').value = f.placeOfDeath || '';
    document.getElementById('efPlaceBurial').value = f.placeOfBurial || '';
    document.getElementById('efCemetery').value = f.cemetery || '';
    document.getElementById('efGraveNo').value = f.graveNumber || '';
    document.getElementById('efInstructions').value = f.specialInstructions || '';
    
    // Checkboxes
    document.getElementById('efHearse').checked = f.hearseRequired;
    document.getElementById('efCar').checked = f.mournersCarRequired;

    // Dates (Convert to YYYY-MM-DD for input type="date")
    if (f.funeralDate) {
        document.getElementById('efDateBurial').value = f.funeralDate.split('T')[0];
    }
    document.getElementById('efTimeBurial').value = f.timeOfBurial || '';

    // Show Modal
    document.getElementById('editFuneralModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editFuneralModal').style.display = 'none';
}

// Handle Form Submit
document.getElementById('editFuneralForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editFunId').value;
    
    const payload = {
        branchCode: document.getElementById('efBranch').value,
        countryOfBirth: document.getElementById('efCountry').value,
        occupation: document.getElementById('efOccupation').value,
        religion: document.getElementById('efReligion').value,
        doctorName: document.getElementById('efDoctor').value,
        causeOfDeath: document.getElementById('efCause').value,
        placeOfDeath: document.getElementById('efPlaceDeath').value,
        placeOfBurial: document.getElementById('efPlaceBurial').value,
        cemetery: document.getElementById('efCemetery').value,
        graveNo: document.getElementById('efGraveNo').value,
        instructions: document.getElementById('efInstructions').value,
        hearseRequired: document.getElementById('efHearse').checked,
        mournersCarRequired: document.getElementById('efCar').checked,
        
        dateOfBurial: document.getElementById('efDateBurial').value,
        timeOfBurial: document.getElementById('efTimeBurial').value
    };

    const res = await fetch(`${API_BASE}/funeral/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Funeral Details Updated!');
        closeEditModal();
        loadFuneralHistory(); // Refresh table to show changes
    } else {
        alert('Error updating details.');
    }
});



// 2. ADD Function to Print Green Form
function printGreenForm(funeralId) {
    // currentFuneralHistory is populated when 'history' tab is loaded
    const f = currentFuneralHistory.find(x => x.id === funeralId);
    if (!f) return;

    // Hide other print areas
    document.getElementById('receipt-print-area').classList.remove('print-active');
    document.getElementById('green-form-print-area').classList.add('print-active');

    // Fill Bio Data
    document.getElementById('gfDate').innerText = new Date().toLocaleDateString();
    document.getElementById('gfId').innerText = "F-" + f.id;
    
    if(f.deceasedMember) {
        document.getElementById('gfSurname').innerText = f.deceasedMember.lastName;
        document.getElementById('gfFirstNames').innerText = f.deceasedMember.firstName;
        document.getElementById('gfIdNo').innerText = f.deceasedMember.idNumber;
        document.getElementById('gfDob').innerText = f.deceasedMember.dateOfBirth || '-';
        document.getElementById('gfAddress').innerText = f.deceasedMember.address || '-';
    }

    // Fill New Fields
    document.getElementById('gfBranch').innerText = f.branchCode || '';
    document.getElementById('gfSex').innerText = f.deceasedMember.sex || ''; 
    document.getElementById('gfMarital').innerText = f.maritalStatus || '';
    document.getElementById('gfOcc').innerText = f.occupation || '';
    
    document.getElementById('gfDOD').innerText = f.dateOfDeath || '';
    document.getElementById('gfPOD').innerText = f.placeOfDeath || '';
    document.getElementById('gfCause').innerText = f.causeOfDeath || '';
    document.getElementById('gfDoc').innerText = f.doctorName || '';
    document.getElementById('gfKin').innerText = f.nextOfKin || '';

    document.getElementById('gfBurialDate').innerText = f.funeralDate ? new Date(f.funeralDate).toLocaleDateString() : '';
    document.getElementById('gfTime').innerText = f.timeOfBurial || '';
    document.getElementById('gfReligion').innerText = f.religion || '';
    document.getElementById('gfMinister').innerText = f.minister || '';
    document.getElementById('gfCemetery').innerText = f.cemetery || '';
    document.getElementById('gfGrave').innerText = f.graveNumber || '';
    document.getElementById('gfGraveType').innerText = f.graveType || '';
    document.getElementById('gfHearse').innerText = f.hearseRequired ? 'Yes' : 'No';
    document.getElementById('gfCar').innerText = f.mournersCarRequired ? 'Yes' : 'No';
    document.getElementById('gfNotes').innerText = f.specialInstructions || '';

    // Fill Financials
    const tbody = document.getElementById('gfExpenseBody');
    tbody.innerHTML = '';
    if(f.expenses) {
        f.expenses.forEach(e => {
            tbody.innerHTML += `<tr>
                <td style="border:1px solid black; padding:5px;">${e.itemName}</td>
                <td style="border:1px solid black; text-align:right; padding:5px;">R ${e.cost.toFixed(2)}</td>
            </tr>`;
        });
    }

    document.getElementById('gfTotal').innerText = `R ${f.totalCost.toFixed(2)}`;
    document.getElementById('gfPaid').innerText = `R ${f.paidBySociety.toFixed(2)}`;
    document.getElementById('gfFamily').innerText = `R ${f.paidByFamily.toFixed(2)}`;

    setTimeout(() => { 
        window.print(); 
        document.getElementById('green-form-print-area').classList.remove('print-active');
    }, 500);
}

// Print Funeral Statement
// 2. Funeral Receipt (New)
function printFuneralReceipt(funeralId) {
    const f = currentFuneralHistory.find(x => x.id === funeralId);
    if (!f) return;

    // Set Active Template
    document.getElementById('receipt-print-area').classList.remove('print-active');
    document.getElementById('funeral-print-area').classList.add('print-active');

    // Fill Basic Info
    const dateObj = new Date(f.funeralDate);
    document.getElementById('funDate').innerText = dateObj.toLocaleDateString();
    document.getElementById('funRef').innerText = "F-" + f.id;
    document.getElementById('funDeceased').innerText = `${f.deceasedMember.firstName} ${f.deceasedMember.lastName}`;
    document.getElementById('funSociety').innerText = f.society.name;
    document.getElementById('funGrave').innerText = f.graveNumber || "-";

    // Fill Financials
    document.getElementById('funTotal').innerText = `R ${f.totalCost.toFixed(2)}`;
    document.getElementById('funSocPaid').innerText = `R ${f.paidBySociety.toFixed(2)}`;
    document.getElementById('funFamilyPay').innerText = `R ${f.paidByFamily.toFixed(2)}`;

    // Fill Audit (Balances)
    const balBefore = f.societyBalanceBefore !== null ? `R ${f.societyBalanceBefore.toFixed(2)}` : "N/A";
    const balAfter = f.societyBalanceAfter !== null ? `R ${f.societyBalanceAfter.toFixed(2)}` : "N/A";
    document.getElementById('funBalBefore').innerText = balBefore;
    document.getElementById('funBalAfter').innerText = balAfter;

    // Fill Expenses List
    const list = document.getElementById('funExpenseList');
    list.innerHTML = '';
    if(f.expenses && f.expenses.length > 0) {
        f.expenses.forEach(e => {
            const li = document.createElement('li');
            li.innerHTML = `• ${e.itemName}: <strong>R ${e.cost.toFixed(2)}</strong>`;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li>No itemized expenses.</li>';
    }

    // Print
    setTimeout(() => { 
        window.print(); 
        document.getElementById('funeral-print-area').classList.remove('print-active');
    }, 200);
}

// NEW: Print the Green Form
function printGreenForm(funeralId) {
    const f = currentFuneralHistory.find(x => x.id === funeralId);
    if (!f) return;

    // Toggle Print View
    document.getElementById('receipt-print-area').classList.remove('print-active');
    document.getElementById('funeral-print-area').classList.remove('print-active');
    document.getElementById('green-form-print-area').classList.add('print-active');

    // Fill Header
    document.getElementById('gfDate').innerText = new Date().toLocaleDateString();
    document.getElementById('gfId').innerText = f.id;

    // Fill Bio Data
    if(f.deceasedMember) {
        document.getElementById('gfSurname').innerText = f.deceasedMember.lastName;
        document.getElementById('gfFirstNames').innerText = f.deceasedMember.firstName;
        document.getElementById('gfIdNo').innerText = f.deceasedMember.idNumber;
        document.getElementById('gfAddress').innerText = f.deceasedMember.address || '';
        document.getElementById('gfSex').innerText = "N/A"; // Assuming sex isn't in Member yet
    }

    // Fill Funeral Details
    document.getElementById('gfBranch').innerText = f.branchCode || '';
    document.getElementById('gfOcc').innerText = f.occupation || '';
    document.getElementById('gfDOD').innerText = f.dateOfDeath || '';
    document.getElementById('gfPOD').innerText = f.placeOfDeath || '';
    document.getElementById('gfCause').innerText = f.causeOfDeath || '';
    document.getElementById('gfDoc').innerText = f.doctorName || '';
    document.getElementById('gfKin').innerText = f.nextOfKin || '';
    
    document.getElementById('gfBurialDate').innerText = new Date(f.funeralDate).toLocaleDateString();
    document.getElementById('gfTime').innerText = f.timeOfBurial || '';
    document.getElementById('gfReligion').innerText = f.religion || '';
    document.getElementById('gfMinister').innerText = f.minister || '';
    document.getElementById('gfCemetery').innerText = f.cemetery || '';
    document.getElementById('gfGrave').innerText = f.graveNumber || '';
    document.getElementById('gfGraveType').innerText = f.graveType || '';
    document.getElementById('gfHearse').innerText = f.hearseRequired ? 'Yes' : 'No';
    document.getElementById('gfCar').innerText = f.mournersCarRequired ? 'Yes' : 'No';
    document.getElementById('gfNotes').innerText = f.specialInstructions || '';

    // Fill Expenses Table
    const tbody = document.getElementById('gfExpenseBody');
    tbody.innerHTML = '';
    if(f.expenses) {
        f.expenses.forEach(e => {
            tbody.innerHTML += `<tr>
                <td style="border-right:1px solid black; padding:2px;">${e.itemName}</td>
                <td style="text-align:right; padding:2px;">${e.cost.toFixed(2)}</td>
            </tr>`;
        });
    }

    // Fill Totals
    document.getElementById('gfTotal').innerText = f.totalCost.toFixed(2);
    document.getElementById('gfPaid').innerText = f.paidBySociety.toFixed(2);
    document.getElementById('gfFamily').innerText = f.paidByFamily.toFixed(2);

    setTimeout(() => { 
        window.print(); 
        document.getElementById('green-form-print-area').classList.remove('print-active');
    }, 200);
}

// Add this to script.js
async function fetchMemberDetailsForFuneral() {
    const memId = document.getElementById('funeralMemberSelect').value;
    updateSocietyBalanceDisplay(); // Call existing balance check

    if(!memId) return;

    // We need an endpoint to get single member. 
    // Assuming you don't have one, we can iterate the societies list again 
    // (not efficient but works with current setup) or add GET /member/{id}
    
    // Quick fix using existing loaded data if possible, or leave blank for user to fill.
    // If you added GET /api/admin/member/{id} to backend, call it here.
}

// --- HELPER: Number to Words ---
function numberToWords(amount) {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    let num = Math.floor(amount);
    if (num === 0) return "Zero";
    let words = '';
    
    if (num >= 1000) { words += numberToWords(Math.floor(num / 1000)) + " Thousand "; num %= 1000; }
    if (num >= 100) { words += units[Math.floor(num / 100)] + " Hundred "; num %= 100; }
    if (num >= 20) { words += tens[Math.floor(num / 10)] + " "; num %= 10; }
    if (num >= 10) { words += teens[num - 10] + " "; num = 0; }
    if (num > 0) { words += units[num] + " "; }
    
    return words.trim();
}

// Init
loadSocieties();