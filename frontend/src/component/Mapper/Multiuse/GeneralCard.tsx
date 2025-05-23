import {Card} from "antd";
import {ReactElement} from "react";

const GeneralCard = ({children} : {children: ReactElement}) => <Card
    style={{
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: "1px solid lightgray",
        margin:"10px"
    }}
>{children}
    </Card>

// todo: Make Functional component.

export default GeneralCard;