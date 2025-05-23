import React from 'react';
import { Slider, Select, Card, Typography, Space, Tooltip, Grid } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import GeneralCard from "./Multiuse/GeneralCard.tsx";

const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const AntdTimelineSelector = ({ year, month, onYearChange, onMonthChange }) => {
    const screens = useBreakpoint();
    const isMobile = !screens.md; // Mobile when screen is smaller than md breakpoint

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

    // Generate year options for mobile dropdown
    const yearOptions = [];
    for (let y = 1960; y <= 2100; y++) {
        yearOptions.push(y);
    }

    return (
        <GeneralCard>
            <div style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                    Year: {year}
                </Text>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    width: '100%'
                }}>
                    {/* Year input - slider on desktop, dropdown on mobile */}
                    <div style={{ flex: 1, paddingRight:"10px" }}>
                        {isMobile ? (
                            <Select
                                value={year}
                                onChange={onYearChange}
                                style={{ width: '100%' }}
                                placeholder="Select Year"
                                showSearch
                                filterOption={(input, option) =>
                                    option.children.toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {yearOptions.map((yearOption) => (
                                    <Option key={yearOption} value={yearOption}>
                                        {yearOption}
                                    </Option>
                                ))}
                            </Select>
                        ) : (
                            <Tooltip title={year}>
                                <Slider
                                    value={year}
                                    min={1960}
                                    max={2100}
                                    marks={marks}
                                    included={true}
                                    onChange={onYearChange}
                                    trackStyle={{ background: '#1890ff' }}
                                    style={{ width: '100%' }}
                                />
                            </Tooltip>
                        )}
                    </div>

                    {/* Month selector */}
                    <Select
                        value={month}
                        onChange={onMonthChange}
                        style={{ minWidth: 140, flexShrink: 0 }}
                        suffixIcon={<CalendarOutlined />}
                    >
                        {months.map((monthName, index) => (
                            <Option key={index + 1} value={index + 1}>
                                {monthName}
                            </Option>
                        ))}
                    </Select>
                </div>
            </div>
        </GeneralCard>
    );
};

export default AntdTimelineSelector;