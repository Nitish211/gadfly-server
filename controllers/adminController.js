exports.getPayouts = async (req, res) => {
    // Placeholder data
    res.json([
        { id: 1, user: 'Partner 1', amount: 500, status: 'Pending', date: '2023-10-27' },
        { id: 2, user: 'Partner 2', amount: 1200, status: 'Paid', date: '2023-10-26' }
    ]);
};

exports.getReports = async (req, res) => {
    res.json([
        { id: 1, reporter: 'User A', reported: 'User B', reason: 'Abusive Behavior', date: '2023-10-28' }
    ]);
};

exports.getGifts = async (req, res) => {
    res.json([
        { id: 1, name: 'Rose', cost: 10, icon: '🌹' },
        { id: 2, name: 'Diamond', cost: 100, icon: '💎' }
    ]);
};
