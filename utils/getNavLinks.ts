export default (approvalLevel?: string) => {
  
  const allMenuItems = [
    {
        title: 'Dashboard',
        icon: 'ti-home',
        to: '/dashboard',
    },
    {
        title: 'SOS Alerts',
        icon: 'ti-rss',
        to: '/sos-alerts',
        onlyShowFor: ['SUPER_ADMIN'],
    },
    {
        title: 'Account',
        icon: 'ti-user',
        to: '/account',
    },
    {
        title: 'Companies',
        icon: 'ti-building',
        to: '/company/list',
        onlyShowFor: ['SUPER_ADMIN'],
    },
    {
        title: 'Users',
        icon: 'ti-users',
        to: '/user/list',
        onlyShowFor: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    },
    {
        title: 'Vehicles',
        icon: 'ti-car',
        to: '/vehicles',
    },
    {
        title: 'Routes',
        icon: 'ti-map',
        to: '/routes',
        onlyShowFor: ['SUPER_ADMIN'],
    },
    {
        title: 'Violations',
        icon: 'ti-list',
        to: '/violations',
    },
    {
        title: 'Activity Logs',
        icon: 'ti-home',
        to: '/logs',
    },
    {
        title: 'OTA Updates',
        icon: 'ti-upload',
        to: '/ota-updates',
        onlyShowFor: ['SUPER_ADMIN'],
    }
  ];

  if (!approvalLevel) 
    return allMenuItems.filter(item => !item.onlyShowFor);

  const filteredMenuItems = allMenuItems.filter((item) => {
    if (item.onlyShowFor)
        return item.onlyShowFor.includes(approvalLevel);
    return true;
  });

  return filteredMenuItems.map(item => {
    return {
        ...item,
        icon: `ti ${item.icon}`
    }
  });
  
}
