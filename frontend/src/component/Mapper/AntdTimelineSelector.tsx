import React from 'react';
import { Slider, Select, Card, Typography, Space, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const AntdTimelineSelector = ({ year, month, onYearChange, onMonthChange }) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const marks = {
        1960: '1960',
        1980: '1980',
        2000: '2000',
        2020: '2020',
        2040: '2040',
        2060: '2060',
        2080: '2080',
        2100: '2100',
    };

    return (
        <Card
            style={{
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: "1px solid lightgray",
                margin:"10px"
            }}
        >
            <Space size="large" style={{ width: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 600, padding: '0 16px' }}>
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                        Year: {year}
                    </Text>
                    <Tooltip title={year}>
                        <Slider
                            value={year}
                            min={1960}
                            max={2100}
                            marks={marks}
                            included={true}
                            onChange={onYearChange}
                            trackStyle={{ background: '#1890ff' }}
                            style={{ marginBottom: 16 }}
                        />
                    </Tooltip>
                </div>

                <Select
                    value={month}
                    onChange={onMonthChange}
                    style={{ minWidth: 140 }}
                    suffixIcon={<CalendarOutlined />}
                >
                    {months.map((monthName, index) => (
                        <Option key={index + 1} value={index + 1}>
                            {monthName}
                        </Option>
                    ))}
                </Select>
            </Space>
        </Card>
    );
};

export default AntdTimelineSelector;