import React, { useState } from 'react';
import { Modal, List, Button, Typography, Space, Badge } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface Model {
    id: string;
    virusType: string;
    modelName: string;
    title: string;
    description: string;
    emoji: string;
    icon: string;
    color: string;
    details: string;
}

interface ModelDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    models: Model[];
    selectedModelId: string;
    onModelSelect: (modelId: string) => void;
}

const ModelDetailsModal: React.FC<ModelDetailsModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 models,
                                                                 selectedModelId,
                                                                 onModelSelect
                                                             }) => {
    const [selectedDetailModelId, setSelectedDetailModelId] = useState(selectedModelId);

    const selectedDetailModel = models.find(m => m.id === selectedDetailModelId) || models[0];

    const handleModelSelect = (modelId: string) => {
        onModelSelect(modelId);
        onClose();
    };

    return (
        <Modal
            title={
                <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', marginBottom: '0' }}>
                    <Title level={4} style={{ margin: 0, color: '#172B4D' }}>
                        Disease Model Details
                    </Title>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                        Compare and select disease models for climate analysis
                    </Text>
                </div>
            }
            open={isOpen}
            onCancel={onClose}
            width={900}
            footer={null}
            styles={{
                body: { padding: '24px 0 0 0' }
            }}
        >
            <div style={{ display: 'flex', height: '600px' }}>
                {/* Left Sidebar - Model List */}
                <div
                    style={{
                        width: '280px',
                        borderRight: '1px solid #f0f0f0',
                        paddingRight: '0',
                        marginRight: '24px'
                    }}
                >
                    <div style={{ padding: '0 24px 16px 24px' }}>
                        <Title level={5} style={{ margin: '0 0 8px 0' }}>
                            Available Models
                        </Title>
                        <p className="tertiary">
                            Select a model to view details
                        </p>
                    </div>

                    <List
                        style={{ height: '500px', overflowY: 'auto' }}
                        dataSource={models}
                        renderItem={(model) => (
                            <List.Item
                                style={{
                                    padding: '12px 24px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedDetailModelId === model.id ? '#f6ffed' : 'transparent',
                                    borderLeft: selectedDetailModelId === model.id ? '3px solid #52c41a' : '3px solid transparent',
                                    borderBottom: '1px solid #f5f5f5'
                                }}
                                onClick={() => setSelectedDetailModelId(model.id)}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: `${model.color}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                position: 'relative'
                                            }}
                                        >
                                            {model.emoji}
                                            {selectedModelId === model.id && (
                                                <Badge
                                                    count={<CheckOutlined style={{ color: '#52c41a', fontSize: '12px' }} />}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        backgroundColor: 'white',
                                                        border: '1px solid #52c41a',
                                                        borderRadius: '50%',
                                                        width: '18px',
                                                        height: '18px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    }
                                    title={
                                        <div>
                                            <Text strong style={{ fontSize: '14px', color: '#172B4D' }}>
                                                {model.modelName}
                                            </Text>
                                            {selectedModelId === model.id && (
                                                <Badge
                                                    status="success"
                                                    text="Current"
                                                    style={{
                                                        marginLeft: '8px',
                                                        fontSize: '11px',
                                                        color: '#52c41a'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    }
                                    description={
                                        <Text style={{ fontSize: '12px', color: '#6B778C' }}>
                                            {model.title}
                                        </Text>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </div>

                {/* Right Panel - Model Details */}
                <div style={{ flex: 1, padding: '0 24px' }}>
                    {selectedDetailModel && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <Space align="center" style={{ marginBottom: '16px' }}>
                                    <div
                                        style={{
                                            width: '72px',
                                            height: '72px',
                                            borderRadius: '20px', // Approx 30% the width/height
                                            background: `${selectedDetailModel.color}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '36px' // Half the width/height
                                        }}
                                    >
                                        {selectedDetailModel.emoji}
                                    </div>
                                    <div>
                                        <Title level={1} style={{ margin: '0 0 4px 0'}}>
                                                {selectedDetailModel.title}
                                        </Title>
                                        <Title level={3} style={{ margin: '0 0 4px 0'}} className="tertiary">
                                            {selectedDetailModel.modelName}
                                        </Title>
                                    </div>
                                </Space>
                                <div>
                                    <Text className="tertiary">
                                        {selectedDetailModel.description}
                                    </Text>
                                </div>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <Title level={5} style={{ marginBottom: '12px', color: '#172B4D' }}>
                                    Model Details
                                </Title>
                                <Paragraph style={{ fontSize: '14px', lineHeight: '1.6', color: '#42526E' }}>
                                    {selectedDetailModel.details}
                                </Paragraph>
                            </div>

                            <div style={{
                                position: 'absolute',
                                bottom: '24px',
                                right: '24px',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <Button onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={() => handleModelSelect(selectedDetailModel.id)}
                                    style={{
                                        backgroundColor: '#0052CC',
                                        borderColor: '#0052CC'
                                    }}
                                >
                                    {selectedModelId === selectedDetailModel.id ? 'Currently Selected' : 'Select Model'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ModelDetailsModal;