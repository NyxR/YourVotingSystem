import React from 'react';
import MetricCard from '../../molecules/metrics_card';
import UserList from '../../organisms/users/user_list';

const items = [
  {
    title: 'Administrators',
    value: 10,
  },
  {
    title: 'Agents',
    value: 20,
  },
  {
    title: 'Voting Sessions',
    value: 5,
  },
];

const AdminDashboard = () => {
  return (
    <div className='flex flex-col pt-5 gap-6'>
      <div className='w-2/3 mx-auto'>
        <div className='flex items-center justify-center gap-6'>
          {items.map((item) => (
            <MetricCard
              key={item.title}
              title={item.title}
              value={item.value}
              className='w-1/3 h-40'
            />
          ))}
        </div>
      </div>
      <div className='w-2/3 mx-auto'>
        <UserList />
      </div>
    </div>
  );
};

export default AdminDashboard;
