
import Header from "../static/Header.tsx";
import Footer from "../static/Footer.tsx";
import NutsMapV5 from "../component/NUTSMapper/NutsMapV5.tsx";


export default () => {


    return(<div>

        <Header />
        <div>
            <NutsMapV5 />
        </div>
        <a href="/nuts5">NUTS 5</a>
        <a href="/cartesian">Cartesian</a>
        <Footer />

    </div>)
}