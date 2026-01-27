// Variables
let currentPartnerId = null;
let allCustomers = [];

// On Load
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('isAdmin')) {
        window.location.href = 'index.html';
    }
    fetchStats();
    fetchRequests(); // Load Request Badges
});

function logout() {
    localStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'block';

    // Update Menu Active State
    document.querySelectorAll('.menu li').forEach(el => el.classList.remove('active'));
    // Simple logic to highlight menu item (can be improved)
    if (id === 'dashboard') document.querySelector('.menu li:nth-child(1)').classList.add('active');
    if (id === 'partners') {
        document.querySelector('.menu li:nth-child(2)').classList.add('active');
        fetchPartners();
    }
    if (id === 'customers') {
        document.querySelector('.menu li:nth-child(3)').classList.add('active');
        fetchCustomers();
    }
    if (id === 'gifts') {
        document.querySelector('.menu li:nth-child(4)').classList.add('active'); // 4th item
        fetchGifts();
    }
    if (id === 'verification') {
        document.querySelector('.menu li:nth-child(2)').classList.add('active'); // Keep Partner tab active visually or separate?
        // Let's assume it's the 2nd item for now or we update indices.
        // Actually, we inserted it as 2nd item in HTML? No, we inserted between Partners and Customers.
        // Partners=2, Verification=3, Customers=4, Gifts=5
        document.querySelector('.menu li:nth-child(2)').classList.remove('active'); // clear others
        document.querySelector('.menu li:nth-child(2)').classList.add('active'); // Wait, let's just make specific logic
        fetchPendingPartners();
    }
    if (id === 'approvals') {
        document.querySelector('.menu li:nth-child(5)').classList.add('active'); // 5th item
        fetchRequests();
    }

    document.getElementById('pageTitle').textContent = id.charAt(0).toUpperCase() + id.slice(1);
}

// --- PARTNERS ---
let allPartners = []; // Store globally for search/edit

async function fetchPartners() {
    const search = document.getElementById('partnerSearch').value;
    try {
        // Must includeBlocked=true to manage them
        const res = await fetch(`/api/user?role=partner&includeBlocked=true&search=${search}`);
        const data = await res.json();
        allPartners = data.data;
        renderPartners(allPartners);
    } catch (e) {
        console.error(e);
    }
}

function renderPartners(list) {
    const tbody = document.getElementById('partnerTableBody');
    tbody.innerHTML = '';

    list.forEach(p => {
        const isBlocked = p.isBlocked === true;
        const empId = p.emplid || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${empId}</td>
            <td><img src="${p.profilePic}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
            <td>${p.firstName} ${p.lastName}</td>
            <td><span class="status" style="background:${p.partnerRole === 'expert' ? '#f3e8ff' : '#eee'};color:${p.partnerRole === 'expert' ? 'purple' : 'black'}">${p.partnerRole ? p.partnerRole.toUpperCase() : 'NORMAL'}</span></td>
            <td>₹${p.audioCallRate}</td>
            <td>₹${p.chatRate || '-'}</td>
            <td><span class="status ${p.currentStatus === 'online' ? 'online' : 'busy'}">${p.currentStatus}</span></td>
            <td>
                <button onclick="toggleBlock('${p.id}', ${isBlocked})" class="btn" style="background:${isBlocked ? '#4caf50' : '#e91e63'};">
                    ${isBlocked ? 'Unblock' : 'Block'}
                </button>
            </td>
            <td><button class="btn btn-edit" onclick="openEditModal('${p.id}')">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleBlock(id, currentStatus) {
    // Optimistic UI update could go here, but let's just reload for safety
    try {
        const res = await fetch('/api/input_update_partner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, isBlocked: !currentStatus })
        });
        const data = await res.json();
        if (data.success) {
            fetchPartners();
        } else {
            alert("Failed to update status");
        }
    } catch (e) {
        console.error(e);
    }
}


// --- EDIT MODAL ---
function openEditModal(id) {
    const p = allPartners.find(x => x.id === id);
    if (!p) return;

    currentPartnerId = id;
    // Populate Modal
    document.getElementById('editFirstName').value = p.firstName;
    document.getElementById('editLastName').value = p.lastName;
    document.getElementById('editProfilePic').value = p.profilePic;
    document.getElementById('editRate').value = p.audioCallRate;
    document.getElementById('editChatRate').value = p.chatRate || 0;
    document.getElementById('editRole').value = p.partnerRole ? p.partnerRole.toLowerCase() : 'basic';
    document.getElementById('editVideoEnabled').checked = p.isVideoCallEnabled === true;

    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function savePartner() {
    const fName = document.getElementById('editFirstName').value;
    const lName = document.getElementById('editLastName').value;
    const pic = document.getElementById('editProfilePic').value;
    const rate = document.getElementById('editRate').value;
    const chatRate = document.getElementById('editChatRate').value;
    const role = document.getElementById('editRole').value;
    const isVideoEnabled = document.getElementById('editVideoEnabled').checked;

    try {
        const res = await fetch('/api/input_update_partner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentPartnerId,
                firstName: fName,
                lastName: lName,
                profilePic: pic,
                audioCallRate: parseInt(rate),
                chatRate: parseInt(chatRate),
                partnerRole: role,
                isVideoCallEnabled: isVideoEnabled
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('Updated Successfully!');
            closeModal();
            fetchPartners(); // Refresh List
        } else {
            alert('Update Failed');
        }
    } catch (e) {
        console.error(e);
        alert('Error updating partner');
    }
}


// --- CUSTOMERS ---
async function fetchCustomers() {
    try {
        const res = await fetch(`/api/customers`);
        allCustomers = await res.json();
        renderCustomers(allCustomers);
    } catch (e) {
        console.error(e);
    }
}

function renderCustomers(list) {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    list.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.emplid || '-'}</td>
            <td>${c.name}</td>
            <td>${c.type.toUpperCase()}</td>
            <td>₹${c.wallet}</td>
            <td>${c.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function switchCustomerTab(type) {
    document.querySelectorAll('#customers .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (type === 'all') {
        renderCustomers(allCustomers);
    } else {
        const filtered = allCustomers.filter(c => c.type === type);
        renderCustomers(filtered);
    }
}

async function fetchStats() {
    // Simple mock stats for now
    const pRes = await fetch(`/api/user?role=partner`);
    const pData = await pRes.json();
    document.getElementById('totalPartners').innerText = pData.data.length;

    const cRes = await fetch(`/api/customers`);
    const cData = await cRes.json();
    document.getElementById('totalCustomers').innerText = cData.length;
}

// --- IMAGE UPLOAD ---
async function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Convert to Base64
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Image = e.target.result;

            // Show loading state
            input.disabled = true;
            document.getElementById('editProfilePic').placeholder = "Uploading...";

            try {
                const res = await fetch('/api/upload_base64', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Image })
                });

                const data = await res.json();

                if (data.success) {
                    // Set the returned URL to the text input
                    document.getElementById('editProfilePic').value = data.url;
                    alert("Image Uploaded Successfully!");
                } else {
                    alert("Upload Failed: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Error Uploading Image");
            } finally {
                input.disabled = false;
                document.getElementById('editProfilePic').placeholder = "Enter URL or Upload";
            }
        };

        reader.readAsDataURL(file);
    }
}

// --- GIFTS ---
async function fetchGifts() {
    try {
        const res = await fetch('/api/gifts');
        const data = await res.json();
        renderGifts(data.data);
    } catch (e) {
        console.error(e);
    }
}

function renderGifts(list) {
    const tbody = document.getElementById('giftTableBody');
    tbody.innerHTML = '';
    list.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${g.icon}" style="width:40px;height:40px;object-fit:contain;background:#f0f0f0;"></td>
            <td>₹${g.price}</td>
            <td>
                <button onclick="toggleGiftStatus('${g.id}', ${g.isActive})" class="btn" style="background:${g.isActive ? '#4caf50' : '#e91e63'};padding:5px 10px;font-size:12px;">
                    ${g.isActive ? 'Active' : 'Disabled'}
                </button>
            </td>
            <td>
                <button class="btn" style="background:red;padding:5px 10px;font-size:12px;" onclick="deleteGift('${g.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddGiftModal() {
    document.getElementById('giftIconUrl').value = '';
    document.getElementById('giftPrice').value = '';
    document.getElementById('uploadGiftIconBtn').value = '';
    document.getElementById('addGiftModal').style.display = 'flex';
}

function closeGiftModal() {
    document.getElementById('addGiftModal').style.display = 'none';
}

// --- VERIFICATION ---
async function fetchPendingPartners() {
    try {
        // Query for PENDING partners
        // We use the existing /api/user endpoint with special params handling
        const res = await fetch('/api/user?role=partner&verificationStatus=pending&includeBlocked=true');
        const data = await res.json();

        // Also update badge
        const count = data.data.length;
        const badge = document.getElementById('pendingBadge');
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        renderVerificationRequests(data.data);
    } catch (e) {
        console.error(e);
        document.getElementById('verificationTableBody').innerHTML = '<tr><td colspan="5">Error fetching data</td></tr>';
    }
}

function renderVerificationRequests(list) {
    const tbody = document.getElementById('verificationTableBody');
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No pending requests.</td></tr>';
        return;
    }

    list.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.profilePic || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
            <td>${p.firstName} ${p.lastName}</td>
            <td>${p.mobile}</td>
            <td>
                ${p.voiceUrl ? `<audio controls src="${p.voiceUrl}" style="height:30px;width:200px;"></audio>` : 'No Audio'}
            </td>
            <td>
                <button class="btn" style="background:#4caf50;" onclick="verifyPartner('${p.id}', 'verified')">Approve</button>
                <button class="btn" style="background:#e91e63;" onclick="verifyPartner('${p.id}', 'rejected')">Reject</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function verifyPartner(id, status) {
    if (!confirm(`Are you sure you want to ${status.toUpperCase()} this partner?`)) return;

    try {
        const res = await fetch('/api/admin/verify_partner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Partner ${status}!`);
            fetchPendingPartners(); // Refresh
        } else {
            alert("Action failed: " + data.message);
        }
    } catch (e) {
        console.error(e);
        alert("Error executing action");
    }
}

async function handleGiftIconUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Image = e.target.result;
            input.disabled = true;
            document.getElementById('giftIconUrl').placeholder = "Uploading...";
            try {
                const res = await fetch('/api/upload_base64', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Image })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('giftIconUrl').value = data.url;
                } else {
                    alert(data.message);
                }
            } catch (err) {
                alert("Upload Error");
            } finally {
                input.disabled = false;
                document.getElementById('giftIconUrl').placeholder = "Icon URL";
            }
        };
        reader.readAsDataURL(file);
    }
}

async function saveNewGift() {
    const icon = document.getElementById('giftIconUrl').value;
    const price = document.getElementById('giftPrice').value;

    if (!icon) return alert("Please upload an Icon first.");
    if (!price) return alert("Please enter a Price.");

    try {
        const res = await fetch('/api/add_gift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icon, price })
        });
        const data = await res.json();
        if (data.success) {
            closeGiftModal();
            fetchGifts();
            alert("Gift Added");
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Error adding gift");
    }
}

async function toggleGiftStatus(id, current) {
    try {
        await fetch('/api/update_gift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isActive: !current })
        });
        fetchGifts();
    } catch (e) {
        console.error(e);
    }
}

async function deleteGift(id) {
    if (!confirm("Are you sure?")) return;
    try {
        await fetch('/api/delete_gift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        fetchGifts();
    } catch (e) {
        console.error(e);
    }
}
