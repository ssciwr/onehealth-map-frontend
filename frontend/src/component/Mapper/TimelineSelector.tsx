import React, { useState } from 'react';
import {
    Box,
    Flex,
    Text,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    useColorModeValue,
    Tooltip
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

/** Deprecated in favor of antd version - because chakra/framer-motion/react-icon imports cause issues */
const TimelineSelector = ({ year, month, onYearChange, onMonthChange }) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Flex
            bg={bgColor}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            p={6}
            align="center"
            gap={6}
            boxShadow="sm"
        >
            <Box flex={1} minW="600px">
                <Text fontSize="sm" color="gray.600" mb={2}>
                    Year: {year}
                </Text>
                <Slider
                    value={year}
                    min={1960}
                    max={2100}
                    step={1}
                    onChange={onYearChange}
                    colorScheme="blue"
                >
                    <SliderTrack bg="gray.200" h={2}>
                        <SliderFilledTrack bg="blue.400" />
                    </SliderTrack>
                    <Tooltip label={year} placement="top" hasArrow>
                        <SliderThumb
                            boxSize={5}
                            bg="red.500"
                            border="3px solid white"
                            boxShadow="lg"
                        />
                    </Tooltip>
                </Slider>
                <Flex justify="space-between" mt={2}>
                    <Text fontSize="xs" color="gray.500">1960</Text>
                    <Text fontSize="xs" color="gray.500">1980</Text>
                    <Text fontSize="xs" color="gray.500">2000</Text>
                    <Text fontSize="xs" color="gray.500">2020</Text>
                    <Text fontSize="xs" color="gray.500">2040</Text>
                    <Text fontSize="xs" color="gray.500">2060</Text>
                    <Text fontSize="xs" color="gray.500">2080</Text>
                    <Text fontSize="xs" color="gray.500">2100</Text>
                </Flex>
            </Box>

            <Menu>
                <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    variant="outline"
                    minW="140px"
                >
                    {months[month - 1]}
                </MenuButton>
                <MenuList>
                    {months.map((monthName, index) => (
                        <MenuItem
                            key={monthName}
                            onClick={() => onMonthChange(index + 1)}
                            bg={month === index + 1 ? 'blue.50' : 'transparent'}
                            color={month === index + 1 ? 'blue.600' : 'inherit'}
                        >
                            {monthName}
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </Flex>
    );
};

export default TimelineSelector;