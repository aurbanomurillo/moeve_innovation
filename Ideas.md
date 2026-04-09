# 1. Gemelos Digitales para Parques Energéticos

Los principales costes (y por ende la mayoría de incidentes laborales) suceden, por un lado, en centrales jóvenes (menos de 10 años) por causas operacionales (falta de experiencia en procesos novedosos, procedimientos en evolución y no extrapolables a nuevas centrales, etc.) y, en cuanto a las centrales _antiguas_ (más de 30 años), por causas de mantenimiento (infraestructuras estresadas, falta de repuestos, etc.). En ambos casos, los gemelos digitales pueden ser una herramienta valiosa para mejorar la seguridad y eficiencia de las operaciones.

## Gemelos Estáticos vs Gemelos Dinámicos

El uso de gemelos dinámicos, si bien proporciona una mayor cantidad de información en tiempo real, también supone una mayor inversión inicial. En caso de progresar hacia un gemelo dinámico, nos permitiría simular completamente y en tiempo real las condiciones del parque para predecir y prevenir posibles fallos o accidentes.

Por otro lado, la implementación de un gemelo estático sería menos costosa ya que se basaría en datos históricos y modelos predefinidos (planos de las centrales, especificaciones técnicas de los componentes, etc.). Nos permitiría simular escenarios específicos y realizar análisis de riesgos sin la necesidad de una infraestructura tecnológica tan avanzada.

Esto supone una ventaja doble en el contexto que estudiamos (transición hacia fuentes de energía renovable: $H_2$, biocombustibles y carga ultrarrápida de vehículos eléctricos), ya que los procesos y tecnologías son relativamente nuevos y en evolución, lo que hace que no dispongamos de suficientes datos en el histórico para estimar con precisión los riesgos asociados a cada proceso. En este sentido, un gemelo estático nos permitiría simular diferentes escenarios, manejando distintas variables y condiciones, para saber qué pasaría en la central en cada caso, y así poder anticiparnos a posibles fallos o accidentes.

Además, en cuanto a la gestión de riesgos que ya han sucedido, el gemelo digital no sólo atacaría a la causa del problema, sino que podría permitir, manejando las mismas variables, simular qué variaciones derivarían en una vuelta a la normalidad más rápida, o incluso en la prevención de que el incidente se agrave.

## Beneficios de la Simulación sobre el Gemelo Digital

- **Identificación de riesgos**: La simulación permite identificar riesgos potenciales en las operaciones del parque, lo que ayuda a implementar medidas preventivas antes de que ocurran accidentes.
- **Optimización de procesos**: Al simular diferentes escenarios, se pueden optimizar los procesos operativos para mejorar la eficiencia y reducir el riesgo de accidentes.
- **Capacitación y formación**: La simulación sobre el gemelo digital puede ser utilizada para capacitar a los trabajadores en situaciones de emergencia o en la operación de nuevos equipos, mejorando su preparación y reduciendo el riesgo de errores humanos.

## Evidencia Empírica en la Industria

1. Nuestro objetivo transcendental: Ejemplos como Cosmo Oil en Japón, que implementó un gemelo digital para su refinería, replican íntegramete la refinería usando Cognite Data Fusion (Base de Datos industrial viva sobre la que se construye el gemelo, que integra la ingestión, contextualización e ingestión de datos) para integrar datos y crear un espacio virtual único para operaciones y mantenimiento.
2. _Synthetic Data Generation for Digital Twins_ $\ref{https://www.tandfonline.com/doi/epdf/10.1080/0951192X.2024.2322981?needAccess=true}$ estudia la creación de gemelos data-driven de sistemas productivos, generando líneas aleatorias y simulando su comportamiento para producir datasets abiertos con los que probar y validar algoritmos de planificación y control. La idea principal es que, ante falta de datos reales (como es el caso de los procesos novedosos que estudiamos), el gemelo permite crear datos sintéticos para entrenar y validar modelos sin necesidad de tocar el sistema físico.

## Creación y Modelado del Gemelo Digital

Si bien la creación del gemelo digital de la central al completo podría ser un proyecto ambicioso y muy atractivo a largo plazo, una primera fase de este proyecto podría centrarse en la creación de gemelos digitales de componentes específicos del parque (como turbinas, generadores, sistemas de control, etc.) para simular su comportamiento y predecir posibles fallos o accidentes. Esto permitiría obtener resultados más rápidos y con una inversión inicial menor como proyecto piloto, para luego escalar hacia un gemelo digital completo de la central.

## Limitaciones principales

- **Dependencia de datos y modelos inexistentes**: Si bien la principal ventaja de un gemelo digital es su capacidad para simular escenarios y predecir riesgos, también es su principal limitación. En el contexto de procesos novedosos, la falta de datos históricos y modelos predefinidos puede dificultar la creación de un gemelo digital preciso y confiable. Especialmente esta última característica, ya que es crucial poder asegurar la equivarianza de consecuencias en ambos gemelos (el digital y el físico) para que las simulaciones sean útiles y aplicables a la realidad.
- **Brecha entre simulación y operación real**: En la práctica es muy difícil modelar bien errores humanos, degradación real, cambios improvisados... De esta forma, el gemelo podría capturar únicamente el mundo ideal de diseño, pero no el mundo real de operación.
- **Solape con iniciativas existentes**: MOEVE ya explora la creación de gemelos digitales para parques energéticos, por lo que es importante asegurarse de que esta iniciativa se diferencie claramente y aporte un valor añadido significativo, en lugar de solaparse con los esfuerzos existentes.

## Mitigación de Limitaciones

- **Acotación de Aplicación**: Centrarse inicialmente en unidades de transición (como tren de $H_2$, sección 2D o bloque de utilities críticos), delimitando las variables clave.
- **Modelo Modular y Escalable**: Diseñar el gemelo digital de forma modular, permitiendo la integración de nuevos datos y modelos a medida que estén disponibles, y facilitando la transición hacia un gemelo digital completo de la central en el futuro.
- **Plan de Datos Realista**: Especificar los datos que asumimos por existentes (tags básicos, P&ID, históricos de un par de años) y qué creamos a través de simulación (datos sintéticos para procesos novedosos, etc.), para asegurar la viabilidad del proyecto y la utilidad de las simulaciones.

# 2. Reducción del Estrés Laboral (Trabajadores individuales) - App de Seguridad Operativa

El error humano es la principal causa de accidentes laborales, y el estrés es un factor importante que contribuye a este error. Soluciones que disminuyan las situaciones de estrés pueden reducir significativamente los accidentes laborales. Esto se puede lograr a través de:

- **Automatización de tareas repetitivas**: Implementar sistemas automatizados para tareas que son monótonas o físicamente exigentes puede reducir la carga de trabajo y el estrés asociado.
- **Mejora de la comunicación**: Utilizar herramientas de comunicación efectivas para mantener a los trabajadores informados y conectados puede reducir la incertidumbre y el estrés.
- **Capacitación y desarrollo**: Proporcionar capacitación adecuada y oportunidades de desarrollo profesional puede aumentar la confianza y reducir el estrés relacionado con la falta de habilidades o conocimientos.

## Funcionalidades

1. **Tests diarios de seguridad**: La app podría incluir tests diarios de seguridad para evaluar el estado emocional, técnico y mental de los trabajadores. Un modelo, una vez entrenado con los datos de estos tests, podría predecir el riesgo de accidente laboral para cada trabajador en función de su estado actual, y así tomar medidas preventivas (como reasignar tareas, proporcionar apoyo emocional, etc.).
2. **Rutas de escape dinámicas**: En caso de emergencia (usando sensores existentes en la mayoría de paruqes), la app podría proporcionar rutas de escape dinámicas basadas en la ubicación actual de cada trabajador y las condiciones del parque, para garantizar una evacuación segura y eficiente. De esta forma, supondría una evaluación natural sobre los procedimientos de emergencia actuales, que suelen ser estáticos y no adaptados a las condiciones cambiantes del parque o el entorno.

De la primera funcionalidad, ya existen aplicaciones en el mundo real, por ejemplo en estaciones petrolíferas, donde se utilizan sensores para monitorear el estado de los trabajadores y detectar signos de fatiga o estrés. Sin embargo, la integración de esta información en una app que también incluya otras funcionalidades (como la comunicación efectiva y la capacitación) podría ser una innovación significativa en el ámbito de la seguridad laboral.

## Limitaciones principales

- **Fricción e Intrusividad para el trabajador**: La implementación de tests diarios de seguridad podría ser percibida como intrusiva o generar resistencia por parte de los trabajadores, especialmente si sienten que su privacidad está siendo invadida o que están siendo evaluados constantemente. Si el trabajador tiene incentivos a ocultar su estado real (por ejemplo, por miedo a perder su trabajo o a ser estigmatizado), tendería a proporcionar respuestas falsas en los tests, lo que reduciría la efectividad de la herramienta.
- **Dependencia de la correlación y causalidad entre estado emocional y riesgo de accidente**: La efectividad de la app dependería en gran medida de la capacidad del modelo para predecir el riesgo de accidente laboral en función del estado emocional, técnico y mental de los trabajadores. Si no existe una correlación clara entre estas variables, o si el modelo no es lo suficientemente preciso, la app podría no ser efectiva para prevenir accidentes.
- **Sobrecarga de alarmas y gestión**: La app podría generar una gran cantidad de alertas y notificaciones, lo que podría resultar abrumador para los trabajadores y dificultar la gestión efectiva de la información.
- **Rutas de escape dinámicas**: Complejidad alta (requerimiento de geolocalización precisa indoor, mapas actualizados, etc.) y posible solape con sistemas de emergencia existentes, por lo que es importante asegurarse de que esta funcionalidad aporte un valor añadido significativo en comparación con los procedimientos de emergencia actuales.

## Mitigación de Limitaciones

- **Diseño centrado en el usuario y test indirecto**: Las condiciones no serán derivadas explícitamente de las preguntas (_¿te sientes capaz de realizar tu trabajo hoy?_), sino que se infieren a través de mini-juegos que, junto con el historial de respuestas en el pasado, permiten al modelo predecir el estado del trabajador sin necesidad de preguntas directas que puedan generar resistencia o respuestas falsas.

# 3. Optimización de las Paradas de Mantenimiento

Cada componente de un parque debe ser parado para revisión y mantenimiento periódicamente. Dichas paradas suponen una pérdida de producción, por lo que es crucial optimizarlas. Además, las paradas de mantenimiento suelen suponer introducir muchas personas distintas (cuadriplicando la cantidad de personas que normalmente trabajan en el parque), personas que pueden no tener una misma cultura de empresa. Dichas personas, en el statu quo, no tienen una comunicación efectiva y fluida entre sí.

Además, si bien las refinerías solo operan alrededor de un 5% del tiempo en modo parada, ese periodo concentra el 50% de los incidentes de riesgo laboral.

## Statu Quo

Hay reuniones diarias de coordinación, pero no hay una herramienta que permita a todas las partes involucradas (operadores, técnicos de mantenimiento, proveedores externos, etc.) tener una visión clara y actualizada del estado del parque y de las tareas que se están realizando.

## Idea

Un modelo que sea capaz de asignar, en tiempo real, las tareas a cada persona involucrada en la parada de mantenimiento, teniendo en cuenta sus habilidades, experiencia y disponibilidad, así como el estado actual del parque y las tareas que se están realizando. De esta forma, implementando una suerte de calendario dinámico, se podría optimizar la asignación de tareas. Además, cada trabajador tendría la facilidad de conocer en todo momento qué tareas se están realizando, quién las está realizando y cuál es el estado de cada tarea, sin necesidad de tener reuniones constantes para coordinarse. Esto no sólo optimizaría la parada de mantenimiento, sino que también reduciría el estrés de los trabajadores al tener una visión clara y actualizada de lo que está sucediendo en el parque.

De esta forma cada contratista, en vez de llegar ciego al riesgo del día (habiendo recibido información genérica sobre seguridad), obtiene información contextual y específica a su tarea, lo que le permite prepararse mejor y reducir el riesgo de accidentes. Además, al tener una visión clara de las tareas que se están realizando y quién las está realizando, se mejora la coordinación entre los diferentes equipos y se reduce el riesgo de errores o malentendidos que podrían llevar a accidentes.

Por último, supone una mejora significativa en el uso de datos derivados de Near Misses e incidentes. Actualmente, no es trivial asignar responsabilidades o causas a los incidentes, lo que dificulta la implementación de medidas preventivas efectivas. Con esta herramienta, se podría analizar cada incidente en detalle, identificando las tareas y personas involucradas, y utilizando esta información para mejorar la planificación de futuras paradas de mantenimiento y reducir el riesgo de accidentes.

## Limitaciones principales

- **Complejidad de la planificación en tiempo real**: Los parones mayores suelen estar condicionados por miles de variables: ventanas de seguridad, dependencias técnicas entre tareas, disponibilidad de recursos, etc.
- **Carga de uso para trabajadores externos**: Depende, para su correcto funcionamiento, de que todos los contratistas y trabajadores externos utilicen y sean capaces de manejar la herramienta de manera efectiva, lo que podría suponer una barrera de entrada y generar resistencia por parte de algunos trabajadores.
- **Foco difuso en seguridad**: Si bien la reducción de estrés y la mejora de la coordinación son objetivos del programa, parece atacar más a la eficiencia operativa que a la seguridad laboral, por lo que es importante asegurarse de que la herramienta también incluya funcionalidades específicas para mejorar la seguridad, como alertas de riesgos, protocolos de emergencia, etc.

## Mitigación de Limitaciones

- **Uso de tecnologías existentes**: MOEVE usa una plataforma actualmente, _Enablon_, como sistema de Control of Work. Si bien es una herramienta que cumple su propósito básico, no permite a los trabajadores tener una visión clara de las actividades relacionadas, horarios solapados... No existe un entorno de información totalmente integrado; el sistema sabe que ha dado el permiso A en la zona B-12, pero no conoce si las personas a las que está asignado dicho permiso se encuentran en las premisas, si han leído el permiso, si hay otras personas trabajando en la zona, etc. De esta forma, una primera fase de este proyecto podría centrarse en mejorar la plataforma existente, integrando funcionalidades que permitan a los trabajadores tener una visión clara y actualizada del estado del parque y de las tareas que se están realizando, sin necesidad de crear una herramienta completamente nueva desde cero.
