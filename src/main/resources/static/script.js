const API_BASE = '/api/admin';

// Global State
let currentContributions = [];
let currentSocietyId = null;
let currentSocietyData = null;
let currentFuneralHistory = []; 
let expenseItems = [];

// --- NAVIGATION ---
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

// --- DASHBOARD: LOAD SOCIETIES ---
async function loadSocieties() {
    const container = document.getElementById('society-cards');
    container.innerHTML = 'Loading societies...';
    
    try {
        const res = await fetch(`${API_BASE}/societies`);
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<p>No societies found. Click "Burial Societies" to create one.</p>';
            return;
        }

        data.forEach(soc => {
            const balance = soc.currentBalance ? soc.currentBalance : 0;
            const memberCount = soc.members ? soc.members.length : 0;
            const accNo = soc.accountNumber ? soc.accountNumber : 'N/A';

            const div = document.createElement('div');
            div.className = 'card'; 
            div.onclick = () => viewSocietyDetails(soc);
            
            div.innerHTML = `
                <h3>${soc.name}</h3>
                <div style="font-size:0.9rem; color:#666;">Acc: ${accNo}</div>
                <div class="money">R ${balance.toFixed(2)}</div>
                <p>${memberCount} Policies/Members</p>
                <small style="color:blue">Click to Manage</small>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">Error loading data. Is the backend running?</p>';
    }
}

// --- SOCIETY DETAILS ---
async function viewSocietyDetails(society) {
    currentSocietyId = society.id;
    currentSocietyData = society;
    document.getElementById('detailTitle').innerText = society.name;
    document.getElementById('editSocietyContainer').style.display = 'none';

    // 1. Members Table with Status Toggle
    const memBody = document.getElementById('membersTableBody');
    memBody.innerHTML = '';
    
    if(society.members && society.members.length > 0) {
        society.members.forEach(m => {
            const plan = m.policyPlan || 'None';
            const type = m.memberType === 'PRIMARY' ? 'Primary' : 'Beneficiary';
            
            // Status Logic
            const statusColor = m.deceased ? 'red' : 'green';
            const statusText = m.deceased ? 'Deceased' : 'Active';
            
            memBody.innerHTML += `
                <tr>
                    <td>${m.idNumber}</td>
                    <td>${m.firstName} ${m.lastName}</td>
                    <td>${plan}</td>
                    <td>${type}</td>
                    <td style="color:${statusColor}; font-weight:bold; cursor:pointer; text-decoration:underline;" 
                        onclick="toggleMemberStatus(${m.id})" title="Click to change status">
                        ${statusText}
                    </td>
                    <td class="action-cell">
                        <button class="danger-btn" onclick="deleteMember(${m.id})">🗑️</button>
                    </td>
                </tr>`;
        });
    } else {
        memBody.innerHTML = '<tr><td colspan="6">No members found.</td></tr>';
    }

    // 2. Load Contributions
    await loadSocietyContributions(society.id);
    showSection('society-details');
}

// --- CONTRIBUTIONS ---
async function loadSocietyContributions(societyId) {
    const tbody = document.getElementById('contribTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    
    const res = await fetch(`${API_BASE}/contributions/society/${societyId}`);
    currentContributions = await res.json();
    
    tbody.innerHTML = '';
    currentContributions.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    currentContributions.forEach(c => {
        const dateStr = new Date(c.paymentDate).toLocaleDateString();
        tbody.innerHTML += `
            <tr>
                <td>${dateStr}</td>
                <td>${c.member.firstName} ${c.member.lastName}</td>
                <td>R ${c.amount.toFixed(2)}</td>
                <td>${c.paymentMethod || 'Cash'}</td>
                <td class="action-cell">
                    <button class="print-btn" onclick="printHistoricalReceipt(${c.id})">🖨️</button>
                    <button class="danger-btn" onclick="deleteContribution(${c.id})">🗑️</button>
                </td>
            </tr>`;
    });
    
    // Calculate Total
    const total = currentContributions.reduce((sum, c) => sum + c.amount, 0);
    document.getElementById('totalContributions').innerText = `R ${total.toFixed(2)}`;
}

// --- FORMS & ACTIONS ---

// 1. CREATE SOCIETY
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

    if (res.ok) {
        alert('Society Created Successfully!');
        document.getElementById('societyForm').reset();
        showSection('dashboard');
    } else {
        alert('Error creating society. Check console.');
    }
});

// 2. Add Member with Policy Plan
document.getElementById('memberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('memType').value;
    const payload = {
        firstName: document.getElementById('memFirstName').value,
        lastName: document.getElementById('memLastName').value,
        idNumber: document.getElementById('memIdNumber').value,
        memberType: type,
        policyPlan: document.getElementById('memPolicy').value, // Policy Plan
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
    if (res.ok) { alert('Policy/Member Added!'); document.getElementById('memberForm').reset(); } 
    else { alert('Error adding member'); }
});

// 3. Record Contribution & Print
document.getElementById('contributionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('contribMemberSelect').value;
    const amount = parseFloat(document.getElementById('contribAmount').value);
    const notes = document.getElementById('contribNotes').value;
    const method = document.getElementById('contribMethod').value;

    const res = await fetch(`${API_BASE}/contribution?memberId=${memberId}&amount=${amount}&notes=${notes}&paymentMethod=${method}`, { method: 'POST' });
    
    if (res.ok) {
        const contribution = await res.json();
        generateReceipt(contribution);
        document.getElementById('contributionForm').reset();
    } else { alert('Error recording payment'); }
});

// 4. Funeral: Auto-Fill Policy Cover
async function updateFuneralFormDetails() {
    const select = document.getElementById('funeralMemberSelect');
    const selectedOption = select.options[select.selectedIndex];
    const plan = selectedOption.getAttribute('data-plan');
    
    updateSocietyBalanceDisplay(selectedOption.getAttribute('data-balance'));

    if(plan && plan !== 'None') {
        const res = await fetch(`${API_BASE}/policy-cover?plan=${plan}`);
        const amount = await res.json();
        document.getElementById('societyPays').value = amount;
    } else {
        document.getElementById('societyPays').value = 0;
    }
}

function updateSocietyBalanceDisplay(bal) {
    if(bal) document.getElementById('budgetDisplay').innerText = `Society Balance: R ${bal}`;
}

// 5. Submit Funeral (Enhanced Error Handling)
async function submitFuneral() {
    const memberId = document.getElementById('funeralMemberSelect').value;
    const societyPays = parseFloat(document.getElementById('societyPays').value) || 0;

    if(!memberId || expenseItems.length === 0) {
        alert('Please select a member and add expenses.'); return;
    }

    const payload = {
        memberId: parseInt(memberId),
        societyPays: societyPays,
        branchCode: document.getElementById('fBranch').value,
        countryOfBirth: document.getElementById('fCountry').value,
        sex: document.getElementById('fSex').value,
        maritalStatus: document.getElementById('fMarital').value,
        dateOfBirth: document.getElementById('fDob').value,
        occupation: document.getElementById('fOccupation').value,
        address: document.getElementById('fAddress').value,
        dateOfDeath: document.getElementById('fDateDeath').value,
        placeOfDeath: document.getElementById('fPlaceDeath').value,
        causeOfDeath: document.getElementById('fCause').value,
        doctorName: document.getElementById('fDoctor').value,
        nextOfKin: document.getElementById('fNextKin').value,
        dateOfBurial: document.getElementById('fDateBurial').value,
        timeOfBurial: document.getElementById('fTimeBurial').value,
        religion: document.getElementById('fReligion').value,
        minister: document.getElementById('fMinister').value,
        cemetery: document.getElementById('fCemetery').value,
        graveNo: document.getElementById('fGraveNo').value,
        graveType: document.getElementById('fGraveType').value,
        hearseRequired: document.getElementById('fHearse').checked,
        mournersCarRequired: document.getElementById('fCar').checked,
        instructions: document.getElementById('fInstructions').value,
        items: expenseItems
    };

    const res = await fetch(`${API_BASE}/funeral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Arrangement Recorded!');
        document.getElementById('funeralForm').reset();
        expenseItems = [];
        renderExpenseTable();
        showSection('history');
    } else { 
        // Parse the error message
        const errorText = await res.text();
        // Check if it's JSON or plain text
        try {
            const errObj = JSON.parse(errorText);
            alert("Error: " + (errObj.message || errObj.error || errorText));
        } catch(e) {
            alert("Error: " + errorText);
        }
    }
}

// --- TOGGLE STATUS ---
async function toggleMemberStatus(id) {
    if(!confirm("Change this member's status (Active <-> Deceased)?")) return;
    
    const res = await fetch(`${API_BASE}/member/${id}/status`, { method: 'PUT' });
    
    if (res.ok) {
        const msg = await res.text();
        alert(msg);
        
        // Refresh the view by re-fetching society details
        // We need to fetch the fresh society object
        const allSocRes = await fetch(`${API_BASE}/societies`);
        const allSocs = await allSocRes.json();
        const updatedSoc = allSocs.find(s => s.id === currentSocietyId);
        
        if (updatedSoc) {
            viewSocietyDetails(updatedSoc);
        }
    } else {
        alert("Error updating status");
    }
}

// --- PRINTING FUNCTIONS ---

function generateReceipt(c) {
    document.getElementById('receipt-print-area').classList.add('print-active');
    document.getElementById('funeral-print-area').classList.remove('print-active');
    document.getElementById('green-form-print-area').classList.remove('print-active');

    document.getElementById('recNo').innerText = c.id;
    document.getElementById('recAccNo').innerText = c.society.accountNumber || "N/A";
    document.getElementById('recMethod').innerText = c.paymentMethod || "Cash";
    document.getElementById('recDate').innerText = new Date(c.paymentDate).toLocaleDateString();
    document.getElementById('recSociety').innerText = c.society.name;
    document.getElementById('recMember').innerText = `${c.member.firstName} ${c.member.lastName}`;
    document.getElementById('recAmount').innerText = `R ${c.amount.toFixed(2)}`;
    document.getElementById('recBalance').innerText = `R ${c.society.currentBalance.toFixed(2)}`;
    document.getElementById('recWords').innerText = numberToWords(c.amount) + " Rands Only";

    setTimeout(() => { window.print(); document.getElementById('receipt-print-area').classList.remove('print-active'); }, 200);
}

function printHistoricalReceipt(id) {
    const c = currentContributions.find(x => x.id === id);
    if(c) generateReceipt(c);
}

function printGreenForm(id) {
    const f = currentFuneralHistory.find(x => x.id === id);
    if(!f) return;
    
    document.getElementById('receipt-print-area').classList.remove('print-active');
    document.getElementById('green-form-print-area').classList.add('print-active');

    document.getElementById('gfDate').innerText = new Date().toLocaleDateString();
    document.getElementById('gfId').innerText = "F-" + f.id;
    if(f.deceasedMember) {
        document.getElementById('gfSurname').innerText = f.deceasedMember.lastName;
        document.getElementById('gfFirstNames').innerText = f.deceasedMember.firstName;
        document.getElementById('gfIdNo').innerText = f.deceasedMember.idNumber;
        // document.getElementById('gfPlan').innerText = f.deceasedMember.policyPlan || "N/A";
        document.getElementById('gfSex').innerText = f.deceasedMember.sex || "";
        document.getElementById('gfAddress').innerText = f.deceasedMember.address || "";
        document.getElementById('gfDOD').innerText = f.dateOfDeath || "";
    }
    document.getElementById('gfBurialDate').innerText = f.funeralDate ? new Date(f.funeralDate).toLocaleDateString() : "";
    document.getElementById('gfTime').innerText = f.timeOfBurial || "";
    document.getElementById('gfCemetery').innerText = f.cemetery || "";
    document.getElementById('gfGrave').innerText = f.graveNumber || "";
    document.getElementById('gfHearse').innerText = f.hearseRequired ? "Yes" : "No";
    document.getElementById('gfCar').innerText = f.mournersCarRequired ? "Yes" : "No";
    document.getElementById('gfNotes').innerText = f.specialInstructions || "";

    const tbody = document.getElementById('gfExpenseBody');
    tbody.innerHTML = '';
    f.expenses.forEach(e => {
        tbody.innerHTML += `<tr><td>${e.itemName}</td><td style="text-align:right">R ${e.cost.toFixed(2)}</td></tr>`;
    });

    document.getElementById('gfTotal').innerText = `R ${f.totalCost.toFixed(2)}`;
    document.getElementById('gfPaid').innerText = `R ${f.paidBySociety.toFixed(2)}`;
    document.getElementById('gfFamily').innerText = `R ${f.paidByFamily.toFixed(2)}`;

    setTimeout(() => { window.print(); document.getElementById('green-form-print-area').classList.remove('print-active'); }, 200);
}

// --- ADMIN DELETE FUNCTIONS ---
async function deleteMember(id) {
    if(!confirm("Delete this member/policy?")) return;
    const res = await fetch(`${API_BASE}/member/${id}`, { method: 'DELETE' });
    if(res.ok) { 
        // Refresh details
        const updatedSocRes = await fetch(`${API_BASE}/societies`);
        const socs = await updatedSocRes.json();
        const updatedSoc = socs.find(s => s.id === currentSocietyId);
        viewSocietyDetails(updatedSoc);
    } 
    else alert("Cannot delete (records exist).");
}

async function deleteContribution(id) {
    if(!confirm("Delete transaction? Balance will be adjusted.")) return;
    const res = await fetch(`${API_BASE}/contribution/${id}`, { method: 'DELETE' });
    if(res.ok) { loadSocietyContributions(currentSocietyId); }
}

async function deleteFuneral(id) {
    if(!confirm("Delete funeral record?")) return;
    const res = await fetch(`${API_BASE}/funeral/${id}`, { method: 'DELETE' });
    if(res.ok) loadFuneralHistory();
}

// --- HELPERS ---
async function loadFuneralHistory() {
    const tbody = document.getElementById('funeralHistoryBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    const res = await fetch(`${API_BASE}/funerals`);
    currentFuneralHistory = await res.json();
    tbody.innerHTML = '';
    
    currentFuneralHistory.forEach(f => {
        const name = f.deceasedMember ? `${f.deceasedMember.firstName} ${f.deceasedMember.lastName}` : 'Unknown';
        tbody.innerHTML += `<tr>
            <td>${new Date(f.funeralDate).toLocaleDateString()}</td>
            <td>${name}</td>
            <td>${f.society.name}</td>
            <td>R ${f.totalCost.toFixed(2)}</td>
            <td>R ${f.paidBySociety.toFixed(2)}</td>
            <td>R ${f.paidByFamily.toFixed(2)}</td>
            <td class="action-cell">
                <button class="print-btn" onclick="printGreenForm(${f.id})" title="Green Form">📄</button>
                <button class="print-btn" style="background:#8e44ad;" onclick="printFuneralReceipt(${f.id})" title="Statement">🧾</button>
                <button class="danger-btn" onclick="deleteFuneral(${f.id})" title="Delete">🗑️</button>
            </td>
        </tr>`;
    });
}

async function loadDropdowns() {
    const resSoc = await fetch(`${API_BASE}/societies`);
    const societies = await resSoc.json();
    const socSelect = document.getElementById('memSocietySelect');
    socSelect.innerHTML = '';
    societies.forEach(s => { socSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`; });
}

async function loadMemberDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">-- Select Member --</option>';
    const res = await fetch(`${API_BASE}/societies`);
    const societies = await res.json();
    societies.forEach(s => {
        if(s.members) {
            s.members.forEach(m => {
                if(elementId === 'contribMemberSelect' && m.deceased) return;
                select.innerHTML += `<option value="${m.id}" data-plan="${m.policyPlan}" data-balance="${s.currentBalance}">${m.firstName} ${m.lastName} (${m.policyPlan || 'No Plan'})</option>`;
            });
        }
    });
}

function toggleEditSociety() {
    const div = document.getElementById('editSocietyContainer');
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
    if(div.style.display === 'block') {
        document.getElementById('editSocietyId').value = currentSocietyData.id;
        document.getElementById('editSocietyName').value = currentSocietyData.name;
        document.getElementById('editSocietyAccNo').value = currentSocietyData.accountNumber;
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
        const updatedSocRes = await fetch(`${API_BASE}/societies`);
        const socs = await updatedSocRes.json();
        const updatedSoc = socs.find(s => s.id == id);
        
        if(updatedSoc) viewSocietyDetails(updatedSoc);
        else showSection('dashboard');
    } else {
        alert('Error updating society');
    }
});

function addExpenseItem() {
    const name = document.getElementById('newItemName').value;
    const cost = parseFloat(document.getElementById('newItemCost').value);
    if(name && cost) {
        expenseItems.push({name, cost});
        renderExpenseTable();
        document.getElementById('newItemName').value = '';
        document.getElementById('newItemCost').value = '';
    }
}

function renderExpenseTable() {
    const tbody = document.getElementById('expenseListBody');
    tbody.innerHTML = '';
    let total = 0;
    expenseItems.forEach((item, idx) => {
        total += item.cost;
        tbody.innerHTML += `<tr><td>${item.name}</td><td>R ${item.cost.toFixed(2)}</td><td><button onclick="expenseItems.splice(${idx},1);renderExpenseTable()">X</button></td></tr>`;
    });
    document.getElementById('displayTotalCost').innerText = `R ${total.toFixed(2)}`;
}

function togglePrimaryMemberSelect() {
    const type = document.getElementById('memType').value;
    document.getElementById('primaryMemberDiv').style.display = (type === 'BENEFICIARY') ? 'block' : 'none';
    if(type === 'BENEFICIARY') {
         const primSelect = document.getElementById('linkedPrimaryMember');
         primSelect.innerHTML = '';
         fetch(`${API_BASE}/societies`).then(r=>r.json()).then(data => {
             data.forEach(s => {
                 if(s.members) {
                     s.members.forEach(m => {
                         if(m.memberType === 'PRIMARY') {
                            primSelect.innerHTML += `<option value="${m.id}">${m.firstName} ${m.lastName}</option>`;
                         }
                     });
                 }
             });
         });
    }
}

function printFuneralReceipt(id) {
    const f = currentFuneralHistory.find(x => x.id === id);
    if (!f) return;

    document.getElementById('receipt-print-area').classList.remove('print-active');
    document.getElementById('green-form-print-area').classList.remove('print-active');
    document.getElementById('funeral-print-area').classList.add('print-active');

    const dateObj = new Date(f.funeralDate);
    document.getElementById('funDate').innerText = dateObj.toLocaleDateString();
    document.getElementById('funRef').innerText = "F-" + f.id;
    document.getElementById('funDeceased').innerText = f.deceasedMember ? `${f.deceasedMember.firstName} ${f.deceasedMember.lastName}` : "Unknown";
    document.getElementById('funSociety').innerText = f.society.name;
    document.getElementById('funGrave').innerText = f.graveNumber || "-";

    document.getElementById('funTotal').innerText = `R ${f.totalCost.toFixed(2)}`;
    document.getElementById('funSocPaid').innerText = `R ${f.paidBySociety.toFixed(2)}`;
    document.getElementById('funFamilyPay').innerText = `R ${f.paidByFamily.toFixed(2)}`;

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

    setTimeout(() => { 
        window.print(); 
        document.getElementById('funeral-print-area').classList.remove('print-active');
    }, 200);
}

function numberToWords(amount) {
    return Math.floor(amount) + " Rands"; 
}

function closeEditModal() {
    document.getElementById('editFuneralModal').style.display = 'none';
}

// Init
loadSocieties();