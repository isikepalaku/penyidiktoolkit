import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SentimentData } from '../../types/sentiment';

interface SentimentChartProps {
  data: SentimentData | null;
  chartType?: 'bar' | 'pie';
}

const SentimentChart: React.FC<SentimentChartProps> = ({ data, chartType = 'bar' }) => {
  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-xl min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] flex items-center justify-center border border-gray-200">
        <p className="text-sm sm:text-base lg:text-lg text-gray-500 text-center">Grafik sentimen akan muncul setelah analisis selesai.</p>
      </div>
    );
  }

  const chartData = [
    { 
      name: 'Positif', 
      value: data.positive, 
      fill: '#10b981', // emerald-500
      color: '#10b981'
    },
    { 
      name: 'Negatif', 
      value: data.negative, 
      fill: '#ef4444', // red-500
      color: '#ef4444'
    },
    { 
      name: 'Netral', 
      value: data.neutral, 
      fill: '#f59e0b', // amber-500
      color: '#f59e0b'
    },
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // For PieChart, payload[0] contains name and value
      // For BarChart, label contains the name and payload[0].value contains the value
      const name = payload[0].name || label || 'Unknown';
      const value = payload[0].value || 0;
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-2 sm:p-3 lg:p-4 shadow-lg">
          <p className="text-xs sm:text-sm lg:text-base text-gray-800 font-medium">
            {`${name}: ${Number(value).toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartType === 'pie') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-xl border border-gray-200">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 lg:mb-6">Distribusi Sentimen (%)</h3>
        <div className="h-64 sm:h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 100 : 120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  color: '#374151', 
                  fontSize: window.innerWidth < 640 ? '12px' : window.innerWidth < 1024 ? '14px' : '16px' 
                }}
                formatter={(value) => <span className="text-xs sm:text-sm lg:text-base text-gray-700">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-xl border border-gray-200">
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 lg:mb-6">Distribusi Sentimen (%)</h3>
      <div className="h-64 sm:h-80 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ 
                fill: '#6b7280', 
                fontSize: window.innerWidth < 640 ? 10 : window.innerWidth < 1024 ? 12 : 14 
              }} 
              axisLine={{ stroke: '#9ca3af' }}
            />
            <YAxis 
              unit="%" 
              tick={{ 
                fill: '#6b7280', 
                fontSize: window.innerWidth < 640 ? 10 : window.innerWidth < 1024 ? 12 : 14 
              }} 
              domain={[0, 100]} 
              axisLine={{ stroke: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: '#374151', 
                fontSize: window.innerWidth < 640 ? '12px' : window.innerWidth < 1024 ? '14px' : '16px' 
              }}
              formatter={(value) => <span className="text-xs sm:text-sm lg:text-base text-gray-700">{value}</span>}
            />
            <Bar dataKey="value" barSize={window.innerWidth < 640 ? 40 : window.innerWidth < 1024 ? 60 : 80} radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={chartData[index].fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Cards - Desktop optimized */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 mt-4 sm:mt-6 lg:mt-8">
        {chartData.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 lg:p-6 text-center border border-gray-200">
            <div 
              className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full mx-auto mb-1 sm:mb-2 lg:mb-3" 
              style={{ backgroundColor: item.fill }}
            ></div>
            <p className="text-gray-600 text-xs sm:text-sm lg:text-base">{item.name}</p>
            <p className="text-gray-800 text-lg sm:text-xl lg:text-2xl font-bold">{item.value.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentChart; 