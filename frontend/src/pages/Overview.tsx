
import Header from "../static/Header.tsx";
import Footer from "../static/Footer.tsx";
import NutsMapV5 from "../component/NUTSMapper/NutsMapV5.tsx";


export default () => {


    return(<div>

        <Header />
        <div>
            <NutsMapV5 nutsLevel='2' />
        </div>
        <Footer />

    </div>)
}