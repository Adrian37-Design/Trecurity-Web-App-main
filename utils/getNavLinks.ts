export default (approvalLevel?: string) => {

    // SVG Paths (Tabler/Heroicons style)
    const icons = {
        home: 'M5 12l-2 0l9 -9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7 M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6',
        rss: 'M5 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M4 4a16 16 0 0 1 16 16 M4 11a9 9 0 0 1 9 9',
        user: 'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2',
        building: 'M3 21l18 0 M9 8l1 0 M9 12l1 0 M9 16l1 0 M14 8l1 0 M14 12l1 0 M14 16l1 0 M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16',
        users: 'M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2 M16 3.13a4 4 0 0 1 0 7.75 M21 21v-2a4 4 0 0 0 -3 -3.85',
        car: 'M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5',
        map: 'M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13 M9 4v13 M15 7v13',
        list: 'M9 6l11 0 M9 12l11 0 M9 18l11 0 M5 6l0 .01 M5 12l0 .01 M5 18l0 .01',
        history: 'M12 8l0 4l2 2 M3.05 11a9 9 0 1 1 .5 9m-.5 -9v-5.5',
        upload: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 9l5 -5l5 5 M12 4l0 12',
        wallet: 'M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12',
        logout: 'M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2 M7 12h14l-3 -3m0 6l3 -3'
    };

    const allMenuItems = [
        {
            title: 'Dashboard',
            iconPath: icons.home,
            to: '/dashboard',
        },
        {
            title: 'SOS Alerts',
            iconPath: icons.rss,
            to: '/sos-alerts',
        },
        {
            title: 'Account',
            iconPath: icons.user,
            to: '/account',
        },
        {
            title: 'Companies',
            iconPath: icons.building,
            to: '/company/list',
            onlyShowFor: ['SUPER_ADMIN', 'MASTER_ADMIN'],
        },
        {
            title: 'Users',
            iconPath: icons.users,
            to: '/user/list',
            onlyShowFor: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MASTER_ADMIN'],
        },
        {
            title: 'Vehicles',
            iconPath: icons.car,
            to: '/vehicles',
        },
        {
            title: 'Routes',
            iconPath: icons.map,
            to: '/routes',
        },
        {
            title: 'Violations',
            iconPath: icons.list,
            to: '/violations',
        },
        {
            title: 'Activity Logs',
            iconPath: icons.history,
            to: '/logs',
        },
        {
            title: 'OTA Updates',
            iconPath: icons.upload,
            to: '/ota-updates',
            onlyShowFor: ['SUPER_ADMIN', 'MASTER_ADMIN'],
        },
        {
            title: (approvalLevel === 'MASTER_ADMIN' || approvalLevel === 'SUPER_ADMIN') ? 'Company Subscriptions' : 'Billing',
            iconPath: icons.wallet,
            to: '/billing',
            onlyShowFor: ['COMPANY_ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN'],
        }
    ];

    if (!approvalLevel)
        return allMenuItems.filter(item => !item.onlyShowFor);

    const filteredMenuItems = allMenuItems.filter((item) => {
        if (item.onlyShowFor)
            return item.onlyShowFor.includes(approvalLevel);
        return true;
    });

    return filteredMenuItems;

}
