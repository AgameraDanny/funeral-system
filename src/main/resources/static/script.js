const API_BASE = '/api/admin';

// Store current data globally for sorting
let currentContributions = [];
let currentSocietyId = null;
let currentSocietyData = null;

let memberBalanceMap = {}; // Stores { memberId: balance }
let expenseItems = [];     // Stores current list of items

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
    currentSocietyData = society; // Save for Edit Form
    document.getElementById('detailTitle').innerText = society.name;
    
    // Hide Edit form initially
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
        // Show form and populate values
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
        showSection('dashboard'); // Reload to see changes
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

// 1. Called from the Table Button (History)
function printHistoricalReceipt(contributionId) {
    // Find the contribution object from the memory list
    const contrib = currentContributions.find(c => c.id === contributionId);
    
    if (contrib) {
        generateReceipt(contrib);
    } else {
        alert("Error: Could not find receipt data.");
    }
}

// 2. Called from the New Payment Form
document.getElementById('contributionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('contribMemberSelect').value;
    const amount = parseFloat(document.getElementById('contribAmount').value);
    const notes = document.getElementById('contribNotes').value;

    const res = await fetch(`${API_BASE}/contribution?memberId=${memberId}&amount=${amount}&notes=${notes}`, { method: 'POST' });
    
    if (res.ok) {
        const contribution = await res.json();
        generateReceipt(contribution); // Use the helper
        document.getElementById('contributionForm').reset();
    } else {
        alert('Error recording payment');
    }
});

// 3. The Master Function that fills the HTML and triggers print
function generateReceipt(contribution) {
    document.getElementById('recNo').innerText = contribution.id;
    
    // Account Number
    document.getElementById('recAccNo').innerText = contribution.society.accountNumber || "N/A";

    const dateObj = new Date(contribution.paymentDate);
    document.getElementById('recDate').innerText = dateObj.toLocaleDateString();
    
    document.getElementById('recSociety').innerText = contribution.society.name;
    document.getElementById('recMember').innerText = `${contribution.member.firstName} ${contribution.member.lastName}`;
    document.getElementById('recAmount').innerText = `R ${contribution.amount.toFixed(2)}`;
    document.getElementById('recBalance').innerText = `R ${contribution.society.currentBalance.toFixed(2)}`;
    document.getElementById('recWords').innerText = numberToWords(contribution.amount) + " Rands Only";

    setTimeout(() => { window.print(); }, 200);
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
        accountNumber: document.getElementById('societyAccNo').value, // NEW
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

// --- Funeral History Logic ---
async function loadFuneralHistory() {
    const tbody = document.getElementById('funeralHistoryBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading records...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/funerals`);
        const funerals = await res.json();

        tbody.innerHTML = '';

        if (funerals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No funerals recorded yet.</td></tr>';
            return;
        }

        // Sort by newest first
        funerals.sort((a, b) => new Date(b.funeralDate) - new Date(a.funeralDate));

        funerals.forEach(f => {
            const dateStr = new Date(f.funeralDate).toLocaleDateString();
            const memberName = f.deceasedMember 
                ? `${f.deceasedMember.firstName} ${f.deceasedMember.lastName}` 
                : 'Unknown';
            const societyName = f.society ? f.society.name : '-';

            // Handle potential nulls for old records
            const balBefore = f.societyBalanceBefore !== null ? `R ${f.societyBalanceBefore.toFixed(2)}` : '-';
            const balAfter = f.societyBalanceAfter !== null ? `R ${f.societyBalanceAfter.toFixed(2)}` : '-';

            const expenseDetails = f.expenses 
                ? f.expenses.map(e => `${e.itemName}: R ${e.cost}`).join('\n') 
                : 'No details';

            const row = `
                <tr>
                    <td>${dateStr}</td>
                    <td>${memberName}</td>
                    <td>${societyName}</td>
                    <td>${f.graveNumber || '-'}</td>
                    <td style="font-weight:bold">R ${f.totalCost.toFixed(2)}</td>
                    <td style="color:green">R ${f.paidBySociety.toFixed(2)}</td>
                    <td style="color:#7f8c8d"><small>${balBefore}</small></td>
                    <td style="color:#2c3e50; font-weight:bold">${balAfter}</td>
                    <td style="color:red">R ${f.paidByFamily.toFixed(2)}</td>
                    <td>
                        <button onclick="alert('Expenses:\\n${expenseDetails}\\n\\nInstructions:\\n${f.specialInstructions || 'None'}')">
                            View Items
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7">Error loading history.</td></tr>';
    }
}

// --- Funeral: Update Balance Display ---
function updateSocietyBalanceDisplay() {
    const memId = document.getElementById('funeralMemberSelect').value;
    const display = document.getElementById('budgetDisplay');
    
    if(memId && memberBalanceMap[memId] !== undefined) {
        display.innerText = `Society Balance: R ${memberBalanceMap[memId]}`;
    } else {
        display.innerText = 'Society Balance: R 0.00'; // FIXED: was $0.00
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
async function submitFuneral() {
    const memberId = document.getElementById('funeralMemberSelect').value;
    const societyPays = document.getElementById('societyPays').value;

    if(!memberId || expenseItems.length === 0) {
        alert('Please select a member and add at least one expense.');
        return;
    }

    const payload = {
        memberId: parseInt(memberId),
        societyPays: parseFloat(societyPays) || 0, // Handle empty input safely
        graveNo: document.getElementById('graveNo').value,
        cemetery: document.getElementById('cemetery').value,
        instructions: document.getElementById('instructions').value,
        items: expenseItems // Send the list
    };

    const res = await fetch(`${API_BASE}/funeral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Funeral Processed Successfully!');
        // Reset form
        expenseItems = [];
        renderExpenseTable();
        document.getElementById('funeralForm').reset();
        document.getElementById('budgetDisplay').innerText = 'Society Balance: R 0.00'; // FIXED: was $0.00
        showSection('dashboard');
    } else {
        const txt = await res.text();
        alert('Error: ' + txt);
    }
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